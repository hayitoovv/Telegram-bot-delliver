"""Admin paneli uchun autentifikatsiya yordamchisi."""
import logging
from django.conf import settings
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from rest_framework.response import Response
from rest_framework import status

from food_delivery.telegram_auth import verify_telegram_data_detailed
from users.models import TelegramUser

logger = logging.getLogger(__name__)

ADMIN_TOKEN_SALT = 'avenue-admin-panel'
ADMIN_TOKEN_MAX_AGE = 24 * 3600  # 24 soat


def _signer():
    return TimestampSigner(salt=ADMIN_TOKEN_SALT)


def create_admin_token(tg_id: int) -> str:
    return _signer().sign(str(int(tg_id)))


def verify_admin_token(token: str) -> int | None:
    if not token:
        return None
    try:
        raw = _signer().unsign(token, max_age=ADMIN_TOKEN_MAX_AGE)
        return int(raw)
    except (BadSignature, SignatureExpired, ValueError):
        return None


def _valid_admin_ids():
    out = set()
    for i in settings.TELEGRAM_ADMIN_CHAT_IDS:
        s = str(i).strip()
        if s.lstrip('-').isdigit():
            out.add(int(s))
    return out


def check_admin(request):
    """
    Request'dan admin'ni tekshiradi. Token yoki initData orqali.
    Muvaffaqiyatli: (user, None) | Xato: (None, Response)
    """
    # 1-variant: admin_token
    token = (
        request.data.get('admin_token')
        or request.query_params.get('admin_token')
        or request.headers.get('X-Admin-Token')
    )
    tg_id = verify_admin_token(token) if token else None

    # 2-variant: Telegram initData
    if tg_id is None:
        init_data = request.data.get('initData') or request.query_params.get('initData', '')
        user_data, reason = verify_telegram_data_detailed(init_data)
        if user_data is None:
            return None, Response(
                {'error': 'Autentifikatsiya xatosi', 'reason': reason or 'no_token'},
                status=status.HTTP_403_FORBIDDEN,
            )
        tg_id = int(user_data.get('id', 0))
    else:
        user_data = {'id': tg_id}

    admin_ids = _valid_admin_ids()
    if tg_id not in admin_ids:
        return None, Response(
            {'error': "Sizda admin huquqlari yo'q"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        user = TelegramUser.objects.get(telegram_id=tg_id)
    except TelegramUser.DoesNotExist:
        user, _ = TelegramUser.objects.get_or_create(
            telegram_id=tg_id,
            defaults={
                'first_name': user_data.get('first_name', 'Admin'),
                'username': user_data.get('username', ''),
            },
        )
    return user, None
