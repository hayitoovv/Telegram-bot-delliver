"""Admin notification moduli."""
import html
import logging
import threading
import time
import requests
from django.conf import settings
from django.utils import timezone

from food_delivery.admin_auth import _valid_admin_ids, create_admin_token

logger = logging.getLogger(__name__)


def broadcast_promotion(promo):
    """Aksiya/elonni barcha foydalanuvchilarga Telegram orqali yuborish.
    Fon thread'da bajariladi — admin panel javobi bloklamaydi.
    Telegram URL'lar orqali rasm qabul qiladi (file_id yoki publichu URL)."""
    from users.models import TelegramUser

    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN sozlanmagan — promo yuborilmadi")
        return

    text = (promo.text or '').strip()
    image_url = None
    if promo.image:
        base = (getattr(settings, 'MINI_APP_URL', '') or '').rstrip('/')
        image_url = f"{base}{promo.image.url}"

    user_ids = list(TelegramUser.objects.values_list('telegram_id', flat=True))
    if not user_ids:
        logger.warning("Foydalanuvchi yo'q — promo yuborilmadi")
        return

    def _do_broadcast():
        sent = 0
        failed = 0
        for tg_id in user_ids:
            try:
                if image_url:
                    payload = {
                        'chat_id': int(tg_id),
                        'photo': image_url,
                        'caption': text,
                        'parse_mode': 'HTML',
                    }
                    endpoint = 'sendPhoto'
                else:
                    payload = {
                        'chat_id': int(tg_id),
                        'text': text,
                        'parse_mode': 'HTML',
                    }
                    endpoint = 'sendMessage'
                resp = requests.post(
                    f"https://api.telegram.org/bot{bot_token}/{endpoint}",
                    json=payload, timeout=15,
                )
                if resp.status_code == 200:
                    sent += 1
                else:
                    failed += 1
                    logger.warning("Promo %s -> tg=%s status=%s body=%s",
                                   promo.id, tg_id, resp.status_code, resp.text[:200])
                # Telegram rate limit: 30 msg/s. ~33ms gap = safe
                time.sleep(0.04)
            except Exception as e:
                failed += 1
                logger.error("Promo %s -> tg=%s xato: %s", promo.id, tg_id, e)

        # Statistika yangilash
        try:
            promo.sent_at = timezone.now()
            promo.sent_count = sent
            promo.failed_count = failed
            promo.save(update_fields=['sent_at', 'sent_count', 'failed_count'])
            logger.info("Promo %s broadcast tugadi: %s ta yuborildi, %s ta xato",
                        promo.id, sent, failed)
        except Exception as e:
            logger.error("Promo %s statistika saqlashda xato: %s", promo.id, e)

    threading.Thread(target=_do_broadcast, daemon=True).start()


def _delivery_label(method: str) -> str:
    return 'Yetkazib berish' if method == 'delivery' else 'Olib ketish'


def _format_admin_order_message(order) -> str:
    """Admin uchun yangi buyurtma xabari — to'liq ma'lumot bilan."""
    u = order.user
    full_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or '-'
    full_name = html.escape(full_name)
    username = ('@' + html.escape(u.username)) if u.username else ''
    phone = html.escape(u.phone or "ko'rsatilmagan")
    address = html.escape(order.address or '-')
    delivery = _delivery_label(order.delivery_method)
    delivery_emoji = '🚚' if order.delivery_method == 'delivery' else '🏪'

    created_at_str = order.created_at.strftime('%d.%m.%Y %H:%M') if order.created_at else '-'

    items_lines = []
    total_items_count = 0
    for item in order.items.all():
        subtotal = item.price * item.quantity
        total_items_count += item.quantity
        items_lines.append(
            f"  • <b>{html.escape(item.product_name)}</b>\n"
            f"     {item.quantity} × {item.price:,} = {subtotal:,} UZS"
        )
    items_text = '\n'.join(items_lines) if items_lines else '  (mahsulotlar yo\'q)'

    coords_line = ''
    if order.latitude is not None and order.longitude is not None:
        coords_line = (
            f"📌 <b>Koordinatalar:</b> "
            f"<a href=\"https://yandex.uz/maps/?ll={order.longitude},{order.latitude}&z=17\">"
            f"{order.latitude:.5f}, {order.longitude:.5f}</a>\n"
        )

    parts = [
        f"🆕 <b>YANGI BUYURTMA #{order.id}</b>",
        f"<i>🕐 {created_at_str}</i>",
        '',
        f"<b>👤 Mijoz:</b> {full_name} {username}".strip(),
        f"📞 <b>Telefon:</b> <code>{phone}</code>",
        f"🆔 <code>{u.telegram_id}</code>",
        '',
        f"{delivery_emoji} <b>Servis:</b> {delivery}",
        f"📍 <b>Manzil:</b> {address}",
        coords_line.rstrip() if coords_line else '',
        '',
        f"📦 <b>Mahsulotlar</b> ({total_items_count} dona):",
        items_text,
        '',
        f"💰 <b>JAMI: {order.total_price:,} UZS</b>",
    ]
    # Restoran (oshpaz) uchun izoh — alohida, ko'rinarli joyda
    if order.restaurant_comment:
        parts.extend(['', f"🍴 <b>Restoran uchun:</b> {html.escape(order.restaurant_comment)}"])
    # Kuryer uchun izoh (yetkazib berish manzili/domofon/kirish kodi)
    if order.comment:
        parts.extend(['', f"🚴 <b>Kuryer uchun:</b> {html.escape(order.comment)}"])

    return '\n'.join(p for p in parts if p is not None)


def _send_telegram(bot_token: str, payload: dict) -> None:
    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json=payload,
            timeout=10,
        )
    except requests.RequestException as e:
        logger.error(f"Telegram send xato (chat_id={payload.get('chat_id')}): {e}")


def notify_admins_new_order(order):
    """Yangi buyurtma haqida BARCHA adminlarga (env + DB) to'liq xabar yuborish.
    Fon thread'da bajariladi — buyurtma yaratish so'rovi bloklamaydi."""
    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN sozlanmagan, notification yuborilmadi")
        return

    admin_ids = list(_valid_admin_ids())
    if not admin_ids:
        logger.warning("Admin'lar yo'q (env va DB ikkalasida), notification yuborilmadi")
        return

    message = _format_admin_order_message(order)
    mini_app_url = (getattr(settings, 'MINI_APP_URL', '') or '').rstrip('/')

    def _do_send():
        for chat_id in admin_ids:
            payload = {
                'chat_id': chat_id,
                'text': message,
                'parse_mode': 'HTML',
                'disable_web_page_preview': True,
            }
            # Admin panel'ni ochish uchun inline tugma (har bir admin uchun alohida token)
            if mini_app_url:
                try:
                    admin_token = create_admin_token(chat_id)
                    panel_url = f"{mini_app_url}/admin-panel/?token={admin_token}"
                    payload['reply_markup'] = {
                        'inline_keyboard': [[
                            {'text': '🛠 Admin panel', 'web_app': {'url': panel_url}},
                        ]],
                    }
                except Exception as e:
                    logger.error("Admin token yaratishda xato: %s", e)
            _send_telegram(bot_token, payload)

    threading.Thread(target=_do_send, daemon=True).start()


def notify_user_new_order(order):
    """Buyurtma qabul qilingani haqida foydalanuvchiga Telegram chek yuborish."""
    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN sozlanmagan, chek yuborilmadi")
        return

    user = order.user
    display_name = html.escape(
        f"{user.first_name or ''} {user.last_name or ''}".strip()
        or (user.username or str(user.telegram_id))
    )
    phone = html.escape(user.phone or '-')

    items_lines = []
    for item in order.items.all():
        name = html.escape(item.product_name)
        subtotal = item.price * item.quantity
        items_lines.append(
            f"{name}\n   {item.quantity} x {item.price:,} = {subtotal:,} UZS"
        )
    items_text = '\n'.join(items_lines)

    address = html.escape(order.address or '-')
    delivery_label = _delivery_label(order.delivery_method)

    lines = [
        f"<b>🆔 ID:</b> #{order.id}",
        f"<b>👤 Mijoz:</b> {display_name}",
        f"<b>📞 Telefon:</b> {phone}",
        f"<b>🚚 Servis turi:</b> {delivery_label}",
        "",
        items_text,
        "",
        f"<b>💰 Jami:</b> {order.total_price:,} UZS",
        f"<b>🚴 Yetkazib berish:</b> 0 UZS",
        "",
        f"<b>📍 Manzil:</b> {address}",
    ]
    if order.restaurant_comment:
        lines.append(f"<b>🍴 Restoran uchun:</b> {html.escape(order.restaurant_comment)}")
    if order.comment:
        lines.append(f"<b>🚴 Kuryer uchun:</b> {html.escape(order.comment)}")
    lines += [
        "",
        f"<b>💵 Jami summa:</b> {order.total_price:,} UZS",
        f"<b>📌 Holati:</b> Yangi",
    ]

    message = "✅ <b>Buyurtma qabul qilindi!</b>\n\n" + '\n'.join(lines)

    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={
                'chat_id': int(user.telegram_id),
                'text': message,
                'parse_mode': 'HTML',
            },
            timeout=10,
        )
    except requests.RequestException as e:
        logger.error(f"Foydalanuvchi {user.telegram_id} ga chek yuborishda xato: {e}")
