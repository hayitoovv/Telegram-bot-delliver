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
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        user, err = check_admin(request)
        if err:
            return err

        from django.db.models import Sum
        qs = (TelegramUser.objects
              .annotate(orders_count=Count('orders'), spent=Sum('orders__total_price'))
              .order_by('-created_at'))
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(first_name__icontains=q) | qs.filter(
                last_name__icontains=q) | qs.filter(username__icontains=q) | qs.filter(
                phone__icontains=q) | qs.filter(telegram_id__icontains=q)

        total = qs.count()
        try:
            page = max(1, int(request.query_params.get('page') or 1))
        except ValueError:
            page = 1
        try:
            per_page = min(200, max(10, int(request.query_params.get('per_page') or 30)))
        except ValueError:
            per_page = 30
        start = (page - 1) * per_page
        qs = qs[start:start + per_page]

        data = []
        for u in qs:
            d = TelegramUserSerializer(u).data
            d['orders_count'] = u.orders_count
            d['spent'] = u.spent or 0
            d['created_at'] = u.created_at.isoformat()
            data.append(d)
        return Response({
            'results': data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })


class AdminUserDetailView(APIView):
    authentication_classes = []
    permission_classes = []

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

        from django.db.models import Sum
        from orders.serializers import OrderSerializer
        orders_qs = u.orders.prefetch_related('items').order_by('-created_at')[:30]
        data['orders_count'] = u.orders.count()
        data['spent'] = u.orders.aggregate(s=Sum('total_price'))['s'] or 0
        data['orders'] = OrderSerializer(orders_qs, many=True, context={'request': request}).data
        return Response(data)


class AdminIssueTokenView(APIView):
    """Bot admin panel link yuborishi uchun token generatsiya qiladi.
    Bot o'z identifikatsiyasini TELEGRAM_BOT_TOKEN orqali tasdiqlaydi
    (bot va backend o'rtasida o'rtoq sir)."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Botni TELEGRAM_BOT_TOKEN orqali tasdiqlash (bot va backend o'rtasida o'rtoq sir)
        provided_secret = (
            (request.data.get('bot_secret') or '')
            or (request.headers.get('X-Bot-Secret') or '')
        ).strip()
        expected = (settings.TELEGRAM_BOT_TOKEN or '').strip()
        if not provided_secret or provided_secret != expected:
            return Response({'error': 'Forbidden'}, status=403)

        try:
            tg_id = int(request.data.get('tg_id') or 0)
        except (TypeError, ValueError):
            return Response({'error': "Noto'g'ri tg_id"}, status=400)

        if not tg_id or tg_id not in _valid_admin_ids():
            return Response({'error': "Sizda admin huquqlari yo'q"}, status=403)

        token = create_admin_token(tg_id)
        return Response({'token': token, 'expires_hours': 24})
