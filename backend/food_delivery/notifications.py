"""Admin notification moduli."""
import html
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _valid_admin_ids():
    out = []
    for i in settings.TELEGRAM_ADMIN_CHAT_IDS:
        s = str(i).strip()
        if s.lstrip('-').isdigit():
            out.append(int(s))
    return out


def notify_admins_new_order(order):
    """Yangi buyurtma haqida adminlarga Telegram orqali xabar yuborish."""
    items_text = '\n'.join(
        f"  - {html.escape(item.product_name)} x{item.quantity} = {item.price * item.quantity:,} UZS"
        for item in order.items.all()
    )

    first_name = html.escape(order.user.first_name or '')
    username = html.escape(order.user.username or '')
    address = html.escape(order.address or '')

    message = (
        f"🆕 Yangi buyurtma #{order.id}\n\n"
        f"👤 {first_name}"
        f"{' @' + username if username else ''}\n"
        f"📍 {address}\n"
        f"💰 {order.total_price:,} UZS\n\n"
        f"📦 Mahsulotlar:\n{items_text}"
    )

    if order.comment:
        message += f"\n\n💬 Izoh: {html.escape(order.comment)}"

    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN sozlanmagan, notification yuborilmadi")
        return

    admin_ids = _valid_admin_ids()
    if not admin_ids:
        logger.warning("TELEGRAM_ADMIN_CHAT_IDS bo'sh yoki noto'g'ri, notification yuborilmadi")
        return

    for chat_id in admin_ids:
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={'chat_id': chat_id, 'text': message, 'parse_mode': 'HTML'},
                timeout=10,
            )
        except requests.RequestException as e:
            logger.error(f"Admin {chat_id} ga xabar yuborishda xato: {e}")


def _delivery_label(method: str) -> str:
    return 'Yetkazib berish' if method == 'delivery' else 'Olib ketish'


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
    if order.comment:
        lines.append(f"<b>💬 Izoh:</b> {html.escape(order.comment)}")
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
