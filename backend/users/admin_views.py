"""Admin paneli uchun User CRUD."""
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from django.conf import settings

from .models import TelegramUser
from .serializers import TelegramUserSerializer
from food_delivery.admin_auth import check_admin, create_admin_token, _valid_admin_ids
from food_delivery.telegram_auth import verify_telegram_data_detailed


class AdminUserListView(APIView):
    def get(self, request):
        user, err = check_admin(request)
        if err:
            return err

        qs = TelegramUser.objects.annotate(orders_count=Count('orders')).order_by('-created_at')
        q = request.query_params.get('q')
        if q:
            qs = qs.filter(first_name__icontains=q) | qs.filter(
                last_name__icontains=q) | qs.filter(username__icontains=q) | qs.filter(
                phone__icontains=q) | qs.filter(telegram_id__icontains=q)
        limit = int(request.query_params.get('limit') or 200)
        qs = qs[:limit]

        data = []
        for u in qs:
            d = TelegramUserSerializer(u).data
            d['orders_count'] = u.orders_count
            d['created_at'] = u.created_at.isoformat()
            data.append(d)
        return Response({'results': data})


class AdminUserDetailView(APIView):
    def get(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        try:
            u = TelegramUser.objects.get(pk=pk)
        except TelegramUser.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)
        data = TelegramUserSerializer(u).data
        data['created_at'] = u.created_at.isoformat()
        data['orders_count'] = u.orders.count()
        return Response(data)


class AdminIssueTokenView(APIView):
    """Bot admin panel link yuborishi uchun token generatsiya qiladi.
    Bot o'z identifikatsiyasini TELEGRAM_BOT_TOKEN orqali tasdiqlaydi
    (bot va backend o'rtasida o'rtoq sir)."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Botni TELEGRAM_BOT_TOKEN orqali tasdiqlash
        provided_secret = (
            request.data.get('bot_secret')
            or request.headers.get('X-Bot-Secret', '')
        )
        if not provided_secret or provided_secret != settings.TELEGRAM_BOT_TOKEN:
            return Response({'error': 'Forbidden'}, status=403)

        try:
            tg_id = int(request.data.get('tg_id') or 0)
        except (TypeError, ValueError):
            return Response({'error': "Noto'g'ri tg_id"}, status=400)

        if not tg_id or tg_id not in _valid_admin_ids():
            return Response({'error': "Sizda admin huquqlari yo'q"}, status=403)

        token = create_admin_token(tg_id)
        return Response({'token': token, 'expires_hours': 24})
