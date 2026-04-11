"""Telegram Food Delivery Bot."""
import os
import logging
import requests
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

load_dotenv()

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
MINI_APP_URL = os.getenv('MINI_APP_URL')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchini kutib olish va ro'yxatga olish."""
    user = update.effective_user

    # Backendda foydalanuvchini ro'yxatga olish
    try:
        requests.post(
            f"{BACKEND_URL}/api/auth/",
            json={
                'initData': f'{{"id": {user.id}, "first_name": "{user.first_name}", '
                            f'"last_name": "{user.last_name or ""}", '
                            f'"username": "{user.username or ""}"}}'
            },
            timeout=10,
        )
    except requests.RequestException as e:
        logger.error(f"Backend ga ulanishda xato: {e}")

    keyboard = [
        [InlineKeyboardButton(
            "🍔 Buyurtma berish",
            web_app=WebAppInfo(url=MINI_APP_URL)
        )],
        [InlineKeyboardButton(
            "📋 Buyurtmalarim",
            callback_data="my_orders"
        )],
    ]

    await update.message.reply_text(
        f"Salom, {user.first_name}! 👋\n\n"
        "🍕 Food Delivery botiga xush kelibsiz!\n\n"
        "Buyurtma berish uchun quyidagi tugmani bosing:",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Yordam xabari."""
    await update.message.reply_text(
        "🔹 /start - Botni ishga tushirish\n"
        "🔹 /help - Yordam\n\n"
        "Buyurtma berish uchun /start bosing va "
        "\"Buyurtma berish\" tugmasini tanlang."
    )


def main():
    """Botni ishga tushirish."""
    if not BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN sozlanmagan!")
    if not MINI_APP_URL:
        raise ValueError("MINI_APP_URL sozlanmagan!")

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))

    logger.info("Bot ishga tushdi...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
