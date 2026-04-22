"""Admin paneli uchun User CRUD."""
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count

from .models import TelegramUser
from .serializers import TelegramUserSerializer
from food_delivery.admin_auth import check_admin


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
