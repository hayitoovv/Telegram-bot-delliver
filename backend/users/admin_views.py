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
    Bot o'zining initData JSON'ini yuboradi (DEBUG rejimda). Telegram id admin
    ro'yxatida bo'lsa — token qaytadi."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        init_data = request.data.get('initData', '')
        user_data, reason = verify_telegram_data_detailed(init_data)
        if user_data is None:
            return Response({'error': 'Autentifikatsiya xatosi', 'reason': reason}, status=403)

        tg_id = int(user_data.get('id', 0))
        if tg_id not in _valid_admin_ids():
            return Response({'error': "Sizda admin huquqlari yo'q"}, status=403)

        token = create_admin_token(tg_id)
        return Response({'token': token, 'expires_hours': 24})
