"""Telegram WebApp initData tekshirish moduli."""
import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qsl, unquote

from django.conf import settings

logger = logging.getLogger(__name__)


def verify_telegram_data(init_data: str) -> dict | None:
    user, _ = verify_telegram_data_detailed(init_data)
    return user


def verify_telegram_data_detailed(init_data: str) -> tuple[dict | None, str | None]:
    """
    Telegram WebApp initData ni tekshiradi.
    Qaytaradi: (user_dict, None) muvaffaqiyatli, (None, sabab) fail bo'lganda.
    """
    if not init_data:
        return None, "empty_init_data"

    # DEBUG rejimda JSON fallback (bot.py register_user uchun)
    if settings.DEBUG and init_data.startswith('{'):
        try:
            return json.loads(init_data), None
        except json.JSONDecodeError as e:
            return None, f"debug_json_parse_error: {e}"

    try:
        pairs = list(parse_qsl(init_data, keep_blank_values=True))
        parsed = {k: v for k, v in pairs}

        received_hash = parsed.get('hash')
        if not received_hash:
            return None, f"hash_missing (keys={sorted(parsed.keys())})"

        bot_token = settings.TELEGRAM_BOT_TOKEN
        if not bot_token:
            return None, "bot_token_not_configured"

        # data-check-string: hash'dan boshqa barcha maydonlar, alifbo tartibida.
        # Telegram'ning yangi signature maydoni HMAC hisobida QATNASHADI.
        data_check_string = '\n'.join(
            f'{k}={v}' for k, v in sorted(pairs) if k != 'hash'
        )
        secret_key = hmac.new(
            b'WebAppData', bot_token.encode(), hashlib.sha256
        ).digest()
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(calculated_hash, received_hash):
            logger.warning(
                "verify_telegram_data: hash_mismatch (token tail=...%s)",
                bot_token[-6:],
            )
            return None, f"hash_mismatch (keys={sorted(parsed.keys())})"

        # auth_date 24 soatdan eski bo'lmasligi kerak
        auth_date = int(parsed.get('auth_date', 0))
        if auth_date and time.time() - auth_date > 86400:
            return None, "auth_date_expired"

        user_str = parsed.get('user')
        if not user_str:
            return None, "user_field_missing"

        return json.loads(unquote(user_str)), None

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        return None, f"parse_exception: {type(e).__name__}: {e}"
