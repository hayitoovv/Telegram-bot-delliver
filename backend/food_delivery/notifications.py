"""Admin notification moduli."""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def notify_admins_new_order(order):
    """Yangi buyurtma haqida adminlarga Telegram orqali xabar yuborish."""
    items_text = '\n'.join(
        f"  - {item.product_name} x{item.quantity} = {item.price * item.quantity:,} UZS"
        for item in order.items.all()
    )

    message = (
        f"🆕 Yangi buyurtma #{order.id}\n\n"
        f"👤 {order.user.first_name}"
        f"{' @' + order.user.username if order.user.username else ''}\n"
        f"📍 {order.address}\n"
        f"💰 {order.total_price:,} UZS\n\n"
        f"📦 Mahsulotlar:\n{items_text}"
    )

    if order.comment:
        message += f"\n\n💬 Izoh: {order.comment}"

    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        logger.warning("TELEGRAM_BOT_TOKEN sozlanmagan, notification yuborilmadi")
        return

    for chat_id in settings.TELEGRAM_ADMIN_CHAT_IDS:
        chat_id = chat_id.strip()
        if not chat_id:
            continue
        try:
            requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={'chat_id': chat_id, 'text': message, 'parse_mode': 'HTML'},
                timeout=10,
            )
        except requests.RequestException as e:
            logger.error(f"Admin {chat_id} ga xabar yuborishda xato: {e}")
