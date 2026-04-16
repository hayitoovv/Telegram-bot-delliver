"""Telegram Food Delivery Bot."""
import os
import re
import asyncio
import logging
import httpx
from dotenv import load_dotenv
from telegram import Update, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters

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

# ============================================
# Translations
# ============================================
TEXTS = {
    'uz': {
        'welcome': "Salom, {name}! 👋\n\n🍕 Food Delivery botiga xush kelibsiz!\n\nQuyidagi menyudan tanlang:",
        'menu': "Menyu",
        'change_lang': "🇷🇺 Русский тил",
        'chat': "Chat",
        'my_orders': "Mening buyurtmalarim",
        'admin_panel': "🛠 Admin panel",
        'no_orders': "📋 Sizda hozircha buyurtmalar yo'q.",
        'choose_lang': "🌐 Tilni tanlang:",
        'lang_changed': "✅ Til o'zgartirildi!",
        'support': "💬 Qo'llab-quvvatlash: @support",
        'help': "🔹 /start - Botni ishga tushirish\n🔹 /help - Yordam\n\nBuyurtma berish uchun /start bosing va \"Menyu\" tugmasini tanlang.",
        'admin_reply_prefix': "💬 Qo'llab-quvvatlash javobi:\n\n",
        'reply_sent': "✅ Javob yuborildi",
        'reply_failed': "❌ Yuborilmadi: {error}",
    },
    'ru': {
        'welcome': "Привет, {name}! 👋\n\n🍕 Добро пожаловать в Food Delivery бот!\n\nВыберите из меню:",
        'menu': "Меню",
        'change_lang': "🇺🇿 O'zbek tili",
        'chat': "Чат",
        'my_orders': "Мои заказы",
        'admin_panel': "🛠 Админ панель",
        'no_orders': "📋 У вас пока нет заказов.",
        'choose_lang': "🌐 Выберите язык:",
        'lang_changed': "✅ Язык изменён!",
        'support': "💬 Поддержка: @support",
        'help': "🔹 /start - Запустить бота\n🔹 /help - Помощь\n\nДля заказа нажмите /start и выберите \"Меню\".",
        'admin_reply_prefix': "💬 Ответ поддержки:\n\n",
        'reply_sent': "✅ Ответ отправлен",
        'reply_failed': "❌ Не отправлено: {error}",
    },
}


def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


async def get_user_lang(user_id: int) -> str:
    """Backend dan foydalanuvchi tilini olish."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{BACKEND_URL}/api/language/", params={'telegram_id': user_id})
            if resp.status_code == 200:
                return resp.json().get('language', 'uz')
    except httpx.HTTPError:
        pass
    return 'uz'


async def set_user_lang(user_id: int, lang: str):
    """Backend da foydalanuvchi tilini saqlash."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"{BACKEND_URL}/api/language/",
                json={
                    'initData': f'{{"id": {user_id}}}',
                    'language': lang,
                },
            )
    except httpx.HTTPError as e:
        logger.error(f"Til saqlashda xato: {e}")


def t(lang: str, key: str, **kwargs) -> str:
    """Tarjima funksiyasi."""
    text = TEXTS.get(lang, TEXTS['uz']).get(key, TEXTS['uz'].get(key, key))
    if kwargs:
        text = text.format(**kwargs)
    return text


async def get_keyboard(user_id: int, lang: str):
    """Til ga qarab keyboard yaratish."""
    keyboard = [
        [KeyboardButton(t(lang, 'menu'), web_app=WebAppInfo(url=MINI_APP_URL))],
        [KeyboardButton(t(lang, 'change_lang')), KeyboardButton(t(lang, 'chat'))],
        [KeyboardButton(t(lang, 'my_orders'))],
    ]
    if is_admin(user_id) and ADMIN_PANEL_URL:
        keyboard.append([KeyboardButton(t(lang, 'admin_panel'), web_app=WebAppInfo(url=ADMIN_PANEL_URL))])
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


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

    lang = await get_user_lang(user.id)
    keyboard = await get_keyboard(user.id, lang)

    await update.message.reply_text(
        t(lang, 'welcome', name=user.first_name),
        reply_markup=keyboard
    )


async def my_orders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = await get_user_lang(update.effective_user.id)
    await update.message.reply_text(t(lang, 'no_orders'))


async def change_language(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Til tanlash inline tugmalari."""
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🇺🇿 O'zbek", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
        ]
    ])
    lang = await get_user_lang(update.effective_user.id)
    await update.message.reply_text(t(lang, 'choose_lang'), reply_markup=keyboard)


async def language_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline tugma bosilganda tilni o'zgartirish."""
    query = update.callback_query
    await query.answer()

    lang = 'ru' if query.data == 'lang_ru' else 'uz'
    user_id = query.from_user.id

    await set_user_lang(user_id, lang)

    keyboard = await get_keyboard(user_id, lang)
    await query.message.reply_text(
        t(lang, 'lang_changed'),
        reply_markup=keyboard
    )


async def chat_support(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lang = await get_user_lang(update.effective_user.id)
    await update.message.reply_text(t(lang, 'support'))


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

    lang = await get_user_lang(user_id)

    logger.info("Forwarding admin reply to user_id=%s", user_id)
    try:
        await context.bot.send_message(
            chat_id=user_id,
            text=t(lang, 'admin_reply_prefix') + reply_text,
        )
        await msg.reply_text(t('uz', 'reply_sent'))
    except Exception as e:
        logger.error("Admin reply yuborilmadi: %s", e)
        await msg.reply_text(t('uz', 'reply_failed', error=str(e)))


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Yordam xabari."""
    lang = await get_user_lang(update.effective_user.id)
    await update.message.reply_text(t(lang, 'help'))


def main():
    """Botni ishga tushirish."""
    if not BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN sozlanmagan!")
    if not MINI_APP_URL:
        raise ValueError("MINI_APP_URL sozlanmagan!")

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CallbackQueryHandler(language_callback, pattern="^lang_"))
    app.add_handler(MessageHandler(filters.Regex("^(Mening buyurtmalarim|Мои заказы)$"), my_orders))
    app.add_handler(MessageHandler(filters.Regex("(Русский тил|O'zbek tili)"), change_language))
    app.add_handler(MessageHandler(filters.Regex("^(Chat|Чат)$"), chat_support))
    # Admin reply'larini qo'lga olish
    app.add_handler(MessageHandler(filters.REPLY & filters.TEXT & ~filters.COMMAND, admin_reply))

    logger.info("Bot ishga tushdi...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
