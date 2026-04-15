"""Telegram Food Delivery Bot."""
import os
import asyncio
import logging
import httpx
from dotenv import load_dotenv
from telegram import Update, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

load_dotenv()

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
MINI_APP_URL = os.getenv('MINI_APP_URL')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')


async def register_user(user):
    """Backendda foydalanuvchini ro'yxatga olish (fon rejimida)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{BACKEND_URL}/api/auth/",
                json={
                    'initData': f'{{"id": {user.id}, "first_name": "{user.first_name}", '
                                f'"last_name": "{user.last_name or ""}", '
                                f'"username": "{user.username or ""}"}}'
                },
            )
    except httpx.HTTPError as e:
        logger.error(f"Backend ga ulanishda xato: {e}")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchini kutib olish va ro'yxatga olish."""
    user = update.effective_user

    asyncio.create_task(register_user(user))

    keyboard = [
        [KeyboardButton("Menyu", web_app=WebAppInfo(url=MINI_APP_URL))],
        [KeyboardButton("Tilni o'zgartirish"), KeyboardButton("Chat")],
        [KeyboardButton("Mening buyurtmalarim")],
    ]

    await update.message.reply_text(
        f"Salom, {user.first_name}! 👋\n\n"
        "🍕 Food Delivery botiga xush kelibsiz!\n\n"
        "Quyidagi menyudan tanlang:",
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    )


async def my_orders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📋 Sizda hozircha buyurtmalar yo'q.")


async def change_language(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🌐 Tilni o'zgartirish tez orada qo'shiladi.")


async def chat_support(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("💬 Qo'llab-quvvatlash: @support")


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
    app.add_handler(MessageHandler(filters.Regex("^Mening buyurtmalarim$"), my_orders))
    app.add_handler(MessageHandler(filters.Regex("^Tilni o'zgartirish$"), change_language))
    app.add_handler(MessageHandler(filters.Regex("^Chat$"), chat_support))

    logger.info("Bot ishga tushdi...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
