"""Telegram WebApp initData tekshirish moduli.

Bir nechta verification variant'larini ketma-ket sinaydi:
- parse_qsl (URL-decoded)
- raw split (URL-encoded, decoded qilinmagan)
- hash va signature'ni turlicha exclude qilish

Biri MATCH qilsa — auth muvaffaqiyatli.
"""
import hashlib
import hmac
import json
import logging
import sys
import time
from urllib.parse import parse_qs, parse_qsl, unquote

from django.conf import settings

logger = logging.getLogger(__name__)

_DEBUG_LOG_PATH = '/tmp/telegram_auth_debug.log'


def _debug_log(msg: str) -> None:
    try:
        print(msg, file=sys.stderr, flush=True)
    except Exception:
        pass
    try:
        with open(_DEBUG_LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(msg + '\n')
    except Exception:
        pass


def _hmac_over(data_check_string: str, bot_token: str) -> str:
    secret = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
    return hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()


def _build_variants(init_data: str):
    """Har xil (data_check_string, nom) juftlarini qaytaradi."""
    # Variant A: parse_qsl (URL-decoded values), exclude hash+signature
    pairs_a = sorted(
        (k, v) for k, v in parse_qsl(init_data, keep_blank_values=True)
        if k not in ('hash', 'signature')
    )
    yield '\n'.join(f'{k}={v}' for k, v in pairs_a), 'parse_qsl_no_sig'

    # Variant B: parse_qsl URL-decoded, exclude only hash (signature qoladi)
    pairs_b = sorted(
        (k, v) for k, v in parse_qsl(init_data, keep_blank_values=True)
        if k != 'hash'
    )
    yield '\n'.join(f'{k}={v}' for k, v in pairs_b), 'parse_qsl_with_sig'

    # Variant C: raw split (URL-encoded bo'yicha qolgan), exclude hash+signature
    parts = [p for p in init_data.split('&') if p]
    pairs_c = sorted(
        p.split('=', 1) for p in parts
        if '=' in p and not p.startswith('hash=') and not p.startswith('signature=')
    )
    yield '\n'.join(f'{k}={v}' for k, v in pairs_c), 'raw_split_no_sig'

    # Variant D: raw split, exclude only hash
    pairs_d = sorted(
        p.split('=', 1) for p in parts
        if '=' in p and not p.startswith('hash=')
    )
    yield '\n'.join(f'{k}={v}' for k, v in pairs_d), 'raw_split_with_sig'


def verify_telegram_data(init_data: str) -> dict | None:
    user, _ = verify_telegram_data_detailed(init_data)
    return user


def verify_telegram_data_detailed(init_data: str) -> tuple[dict | None, str | None]:
    if not init_data:
        return None, "empty_init_data"

    # DEBUG rejimda JSON fallback
    if settings.DEBUG and init_data.startswith('{'):
        try:
            return json.loads(init_data), None
        except json.JSONDecodeError as e:
            return None, f"debug_json_parse_error: {e}"

    try:
        parsed = parse_qs(init_data, keep_blank_values=True)
        received_hash = parsed.get('hash', [None])[0]
        if not received_hash:
            return None, f"hash_missing (keys={sorted(parsed.keys())})"

        bot_token = settings.TELEGRAM_BOT_TOKEN
        if not bot_token:
            return None, "bot_token_not_configured"

        # Barcha variantlarni sinash — biri MATCH qilsa, OK
        attempts = []
        winning_variant = None
        for dcs, name in _build_variants(init_data):
            calc = _hmac_over(dcs, bot_token)
            attempts.append((name, calc))
            if hmac.compare_digest(calc, received_hash):
                winning_variant = name
                break

        if winning_variant is None:
            _debug_log(
                "=== HASH_MISMATCH (barcha variant fail) ===\n"
                f"  raw_init_data={init_data!r}\n"
                f"  received_hash={received_hash}\n"
                "  attempts:\n" +
                '\n'.join(f"    {n}: {h}" for n, h in attempts) +
                f"\n  token_len={len(bot_token)} tail=...{bot_token[-6:]}\n"
                "=========================="
            )
            return None, f"hash_mismatch (keys={sorted(parsed.keys())})"

        # auth_date muddati tekshirish
        auth_date = int(parsed.get('auth_date', [0])[0])
        if auth_date and time.time() - auth_date > 86400:
            return None, f"auth_date_expired"

        user_str = parsed.get('user', [None])[0]
        if not user_str:
            return None, f"user_field_missing"

        logger.info("verify_telegram_data: MATCH via %s", winning_variant)
        return json.loads(unquote(user_str)), None

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        return None, f"parse_exception: {type(e).__name__}: {e}"
