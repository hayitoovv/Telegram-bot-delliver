"""Telegram Food Delivery Bot."""
import os
import re
import asyncio
import logging
import httpx
from dotenv import load_dotenv
from telegram import Update, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

USER_ID_RE = re.compile(r"🆔\s*(\d+)")

load_dotenv()

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
MINI_APP_URL = os.getenv('MINI_APP_URL')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')
ADMIN_PANEL_URL = os.getenv('ADMIN_PANEL_URL', '')
ADMIN_IDS = {
    int(x) for x in os.getenv('TELEGRAM_ADMIN_CHAT_IDS', '').split(',') if x.strip().isdigit()
}


def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


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
    if is_admin(user.id) and ADMIN_PANEL_URL:
        keyboard.append([KeyboardButton("🛠 Admin panel", web_app=WebAppInfo(url=ADMIN_PANEL_URL))])

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


async def admin_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin bot xabariga reply qilsa — foydalanuvchiga yuborish."""
    msg = update.message
    logger.info("admin_reply triggered: from=%s reply=%s",
                msg.from_user.id if msg and msg.from_user else None,
                bool(msg.reply_to_message) if msg else None)

    if not msg or not msg.from_user:
        return
    if not is_admin(msg.from_user.id):
        logger.info("Not admin: %s (admins=%s)", msg.from_user.id, ADMIN_IDS)
        return
    if not msg.reply_to_message or not msg.reply_to_message.from_user:
        logger.info("No reply_to_message")
        return
    if not msg.reply_to_message.from_user.is_bot:
        logger.info("Reply not to bot")
        return

    original_text = msg.reply_to_message.text or ""
    match = USER_ID_RE.search(original_text)
    if not match:
        logger.info("No 🆔 marker in original: %s", original_text[:100])
        return

    user_id = int(match.group(1))
    reply_text = msg.text or ""
    if not reply_text:
        return

    logger.info("Forwarding admin reply to user_id=%s", user_id)
    try:
        await context.bot.send_message(
            chat_id=user_id,
            text=f"💬 Qo'llab-quvvatlash javobi:\n\n{reply_text}",
        )
        await msg.reply_text("✅ Javob yuborildi")
    except Exception as e:
        logger.error("Admin reply yuborilmadi: %s", e)
        await msg.reply_text(f"❌ Yuborilmadi: {e}")


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
    # Admin reply'larini qo'lga olish
    app.add_handler(MessageHandler(filters.REPLY & filters.TEXT & ~filters.COMMAND, admin_reply))

    logger.info("Bot ishga tushdi...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
