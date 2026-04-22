"""Admin paneli uchun autentifikatsiya yordamchisi."""
import logging
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status

from food_delivery.telegram_auth import verify_telegram_data_detailed
from users.models import TelegramUser

logger = logging.getLogger(__name__)


def _valid_admin_ids():
    out = set()
    for i in settings.TELEGRAM_ADMIN_CHAT_IDS:
        s = str(i).strip()
        if s.lstrip('-').isdigit():
            out.add(int(s))
    return out


def check_admin(request):
    """
    Request'dan admin'ni tekshiradi.
    Muvaffaqiyatli: (user, None)
    Xato: (None, Response)
    """
    init_data = request.data.get('initData') or request.query_params.get('initData', '')

    # DIAGNOSTIC — tekshirish uchun vaqtincha log
    logger.error(
        "[ADMIN-AUTH] path=%s method=%s init_data_len=%d init_data_start=%s",
        request.path, request.method, len(init_data), init_data[:80]
    )

    user_data, reason = verify_telegram_data_detailed(init_data)
    logger.error("[ADMIN-AUTH] verify result: user_data=%s reason=%s",
                 user_data, reason)

    if user_data is None:
        return None, Response(
            {'error': 'Autentifikatsiya xatosi', 'reason': reason},
            status=status.HTTP_403_FORBIDDEN,
        )

    admin_ids = _valid_admin_ids()
    tg_id = int(user_data.get('id', 0))
    logger.error("[ADMIN-AUTH] tg_id=%s admin_ids=%s match=%s",
                 tg_id, admin_ids, tg_id in admin_ids)

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
