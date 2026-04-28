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


def _env_admin_ids():
    """Env'dagi 'super admin' lar — panelda o'chirilmaydi."""
    out = set()
    for i in settings.TELEGRAM_ADMIN_CHAT_IDS:
        s = str(i).strip()
        if s.lstrip('-').isdigit():
            out.add(int(s))
    return out


def _valid_admin_ids():
    """Env admin'lar + DB is_admin=True bo'lgan foydalanuvchilar."""
    ids = _env_admin_ids()
    try:
        ids.update(
            TelegramUser.objects.filter(is_admin=True).values_list('telegram_id', flat=True)
        )
    except Exception:
        pass
    return ids


def is_super_admin(tg_id: int) -> bool:
    """Super admin — env'dagi yoki DB'da is_super_admin=True bo'lganlar."""
    try:
        tg_id = int(tg_id)
    except (TypeError, ValueError):
        return False
    if tg_id in _env_admin_ids():
        return True
    try:
        return TelegramUser.objects.filter(
            telegram_id=tg_id, is_super_admin=True
        ).exists()
    except Exception:
        return False


def check_admin(request):
    """
    Request'dan admin'ni tekshiradi. Token yoki initData orqali.
    Muvaffaqiyatli: (user, None) | Xato: (None, Response)
    """
    # 1-variant: admin_token
    token_body = ''
    try:
        token_body = request.data.get('admin_token') or ''
    except Exception:
        pass
    token_query = request.query_params.get('admin_token') or ''
    token_header = request.headers.get('X-Admin-Token') or ''
    token = token_body or token_query or token_header
    tg_id = verify_admin_token(token) if token else None

    logger.error(
        "[ADMIN-CHECK] path=%s method=%s ct=%s tok_body=%d tok_query=%d tok_header=%d tg_id=%s",
        request.path, request.method,
        request.content_type if hasattr(request, 'content_type') else '-',
        len(token_body), len(token_query), len(token_header),
        tg_id,
    )

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
    # Auth qilgan admin'ning tg_id'sini user object'ga biriktiramiz
    user._admin_tg_id = tg_id
    return user, None


def require_super_admin(request):
    """View ichida chaqiriladi — super admin bo'lmasa 403 qaytaradi."""
    from rest_framework.response import Response
    from rest_framework import status as _s
    user, err = check_admin(request)
    if err:
        return None, err
    if not is_super_admin(user.telegram_id):
        return None, Response(
            {'error': "Bu amal faqat super admin uchun (.env TELEGRAM_ADMIN_CHAT_IDS)"},
            status=_s.HTTP_403_FORBIDDEN,
        )
    return user, None
