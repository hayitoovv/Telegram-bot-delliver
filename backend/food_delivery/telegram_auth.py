"""Telegram WebApp initData tekshirish moduli."""
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs, unquote

from django.conf import settings


def verify_telegram_data(init_data: str) -> dict | None:
    """
    Telegram WebApp initData ni tekshiradi.
    Agar yaroqli bo'lsa, user ma'lumotlarini qaytaradi.
    Agar yaroqsiz bo'lsa, None qaytaradi.
    """
    if not init_data:
        return None

    # DEBUG rejimda test uchun
    if settings.DEBUG and init_data.startswith('{'):
        try:
            return json.loads(init_data)
        except json.JSONDecodeError:
            return None

    try:
        parsed = parse_qs(init_data)

        # hash ni olish
        received_hash = parsed.get('hash', [None])[0]
        if not received_hash:
            return None

        # hash siz data-check-string yaratish
        data_pairs = []
        for key, values in sorted(parsed.items()):
            if key == 'hash':
                continue
            data_pairs.append(f"{key}={values[0]}")

        data_check_string = '\n'.join(data_pairs)

        # Secret key yaratish
        bot_token = settings.TELEGRAM_BOT_TOKEN
        secret_key = hmac.new(
            b'WebAppData', bot_token.encode(), hashlib.sha256
        ).digest()

        # Hash tekshirish
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        if calculated_hash != received_hash:
            return None

        # auth_date tekshirish (24 soatdan eski bo'lmasligi kerak)
        auth_date = int(parsed.get('auth_date', [0])[0])
        if time.time() - auth_date > 86400:
            return None

        # User ma'lumotlarini olish
        user_str = parsed.get('user', [None])[0]
        if not user_str:
            return None

        return json.loads(unquote(user_str))

    except (json.JSONDecodeError, KeyError, ValueError):
        return None
