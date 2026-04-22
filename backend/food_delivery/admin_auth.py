"""Admin paneli uchun autentifikatsiya yordamchisi."""
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status

from food_delivery.telegram_auth import verify_telegram_data_detailed
from users.models import TelegramUser


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
    user_data, reason = verify_telegram_data_detailed(init_data)
    if user_data is None:
        return None, Response(
            {'error': 'Autentifikatsiya xatosi', 'reason': reason},
            status=status.HTTP_403_FORBIDDEN,
        )

    admin_ids = _valid_admin_ids()
    tg_id = int(user_data.get('id', 0))
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
