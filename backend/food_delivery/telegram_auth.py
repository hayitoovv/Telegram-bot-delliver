"""Telegram WebApp initData tekshirish moduli."""
import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qs, unquote

from django.conf import settings

logger = logging.getLogger(__name__)


def verify_telegram_data(init_data: str) -> dict | None:
    """
    Telegram WebApp initData ni tekshiradi.
    Agar yaroqli bo'lsa, user ma'lumotlarini qaytaradi.
    Agar yaroqsiz bo'lsa, None qaytaradi.
    """
    if not init_data:
        logger.warning("verify_telegram_data: bo'sh initData")
        return None

    # DEBUG rejimda test uchun JSON ko'rinishidagi fallback
    if settings.DEBUG and init_data.startswith('{'):
        try:
            return json.loads(init_data)
        except json.JSONDecodeError:
            logger.warning("verify_telegram_data: DEBUG JSON parse xato")
            return None

    try:
        parsed = parse_qs(init_data, keep_blank_values=True)

        received_hash = parsed.get('hash', [None])[0]
        if not received_hash:
            logger.warning("verify_telegram_data: hash topilmadi")
            return None

        # data-check-string: hash va signature (agar bor bo'lsa) dan boshqa
        # hamma maydonlar, alifbo tartibida, \n orqali ulangan.
        data_pairs = []
        for key, values in sorted(parsed.items()):
            if key in ('hash', 'signature'):
                continue
            data_pairs.append(f"{key}={values[0]}")

        data_check_string = '\n'.join(data_pairs)

        bot_token = settings.TELEGRAM_BOT_TOKEN
        if not bot_token:
            logger.error("verify_telegram_data: TELEGRAM_BOT_TOKEN sozlanmagan")
            return None

        secret_key = hmac.new(
            b'WebAppData', bot_token.encode(), hashlib.sha256
        ).digest()

        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        if calculated_hash != received_hash:
            logger.warning(
                "verify_telegram_data: hash mos kelmadi. "
                "Kutilgan=%s, kelgan=%s, keys=%s",
                calculated_hash, received_hash, sorted(parsed.keys()),
            )
            return None

        # auth_date 24 soatdan eski bo'lmasligi kerak
        auth_date = int(parsed.get('auth_date', [0])[0])
        if auth_date and time.time() - auth_date > 86400:
            logger.warning("verify_telegram_data: auth_date muddati o'tgan")
            return None

        user_str = parsed.get('user', [None])[0]
        if not user_str:
            logger.warning("verify_telegram_data: user maydoni yo'q")
            return None

        return json.loads(unquote(user_str))

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning("verify_telegram_data: parse xato: %s", e)
        return None
