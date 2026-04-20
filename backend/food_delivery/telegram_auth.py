"""Telegram WebApp initData tekshirish moduli."""
import hashlib
import hmac
import json
import logging
import sys
import time
from urllib.parse import parse_qs, unquote

from django.conf import settings

logger = logging.getLogger(__name__)

_DEBUG_LOG_PATH = '/tmp/telegram_auth_debug.log'


def _debug_log(msg: str) -> None:
    """Ham stderr, ham /tmp/ ga yozadi — diagnostika uchun."""
    try:
        print(msg, file=sys.stderr, flush=True)
    except Exception:
        pass
    try:
        with open(_DEBUG_LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(msg + '\n')
    except Exception:
        pass


def verify_telegram_data(init_data: str) -> dict | None:
    """Telegram WebApp initData — dict qaytaradi yoki None."""
    user, _ = verify_telegram_data_detailed(init_data)
    return user


def verify_telegram_data_detailed(init_data: str) -> tuple[dict | None, str | None]:
    """
    Telegram WebApp initData ni tekshiradi.
    Qaytaradi: (user_dict, None) muvaffaqiyatli, (None, sabab) fail bo'lganda.
    """
    if not init_data:
        reason = "empty_init_data"
        logger.warning("verify_telegram_data: %s", reason)
        return None, reason

    # DEBUG rejimda test uchun JSON ko'rinishidagi fallback
    if settings.DEBUG and init_data.startswith('{'):
        try:
            return json.loads(init_data), None
        except json.JSONDecodeError as e:
            reason = f"debug_json_parse_error: {e}"
            logger.warning("verify_telegram_data: %s", reason)
            return None, reason

    try:
        parsed = parse_qs(init_data, keep_blank_values=True)

        received_hash = parsed.get('hash', [None])[0]
        if not received_hash:
            reason = f"hash_missing (keys={sorted(parsed.keys())})"
            logger.warning("verify_telegram_data: %s", reason)
            return None, reason

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
            reason = "bot_token_not_configured"
            logger.error("verify_telegram_data: %s", reason)
            return None, reason

        secret_key = hmac.new(
            b'WebAppData', bot_token.encode(), hashlib.sha256
        ).digest()

        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        if calculated_hash != received_hash:
            reason = f"hash_mismatch (keys={sorted(parsed.keys())})"
            _debug_log(
                "=== HASH_MISMATCH DIAG ===\n"
                f"  raw_init_data={init_data!r}\n"
                f"  data_check_string={data_check_string!r}\n"
                f"  expected={calculated_hash}\n"
                f"  got={received_hash}\n"
                f"  token_tail=...{bot_token[-6:] if bot_token else ''} (len={len(bot_token)})\n"
                "=========================="
            )
            return None, reason

        # auth_date 24 soatdan eski bo'lmasligi kerak
        auth_date = int(parsed.get('auth_date', [0])[0])
        if auth_date and time.time() - auth_date > 86400:
            reason = f"auth_date_expired (auth_date={auth_date}, now={int(time.time())})"
            logger.warning("verify_telegram_data: %s", reason)
            return None, reason

        user_str = parsed.get('user', [None])[0]
        if not user_str:
            reason = f"user_field_missing (keys={sorted(parsed.keys())})"
            logger.warning("verify_telegram_data: %s", reason)
            return None, reason

        return json.loads(unquote(user_str)), None

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        reason = f"parse_exception: {type(e).__name__}: {e}"
        logger.warning("verify_telegram_data: %s", reason)
        return None, reason
