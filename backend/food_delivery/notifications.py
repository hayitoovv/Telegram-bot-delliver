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
