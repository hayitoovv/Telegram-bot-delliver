"""Admin paneli uchun Order CRUD/management."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count

from .models import Order
from .serializers import OrderSerializer
from food_delivery.admin_auth import check_admin


ALLOWED_STATUSES = {s[0] for s in Order.Status.choices}


class AdminOrderListView(APIView):
    def get(self, request):
        user, err = check_admin(request)
        if err:
            return err

        qs = Order.objects.select_related('user').prefetch_related('items').all().order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter and status_filter in ALLOWED_STATUSES:
            qs = qs.filter(status=status_filter)
        q = request.query_params.get('q')
        if q:
            qs = qs.filter(user__first_name__icontains=q) | qs.filter(
                user__username__icontains=q) | qs.filter(id__icontains=q) | qs.filter(
                address__icontains=q)
        limit = int(request.query_params.get('limit') or 100)
        qs = qs[:limit]
        return Response({'results': OrderSerializer(qs, many=True, context={'request': request}).data})


class AdminOrderDetailView(APIView):
    def get(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        try:
            order = Order.objects.select_related('user').get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)
        data = OrderSerializer(order, context={'request': request}).data
        data['user_detail'] = {
            'telegram_id': order.user.telegram_id,
            'first_name': order.user.first_name,
            'last_name': order.user.last_name,
            'username': order.user.username,
            'phone': order.user.phone,
        }
        return Response(data)

    def patch(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)

        new_status = request.data.get('status')
        if new_status and new_status in ALLOWED_STATUSES:
            order.status = new_status
            order.save(update_fields=['status'])
            return Response(OrderSerializer(order, context={'request': request}).data)
        return Response({'error': "Noto'g'ri status"}, status=400)


class AdminOrderBulkStatusView(APIView):
    def post(self, request):
        user, err = check_admin(request)
        if err:
            return err
        ids = request.data.get('ids') or []
        new_status = request.data.get('status')
        if not ids or new_status not in ALLOWED_STATUSES:
            return Response({'error': "Noto'g'ri so'rov"}, status=400)
        Order.objects.filter(id__in=ids).update(status=new_status)
        return Response({'ok': True, 'count': len(ids)})


class AdminDashboardView(APIView):
    def get(self, request):
        user, err = check_admin(request)
        if err:
            return err

        stats_by_status = {s[0]: 0 for s in Order.Status.choices}
        agg = Order.objects.values('status').annotate(count=Count('id'))
        for row in agg:
            stats_by_status[row['status']] = row['count']

        today_revenue = Order.objects.filter(
            status__in=['accepted', 'preparing', 'delivering', 'delivered']
        ).aggregate(total=Sum('total_price'))['total'] or 0

        recent = Order.objects.select_related('user').order_by('-created_at')[:5]
        recent_data = OrderSerializer(recent, many=True, context={'request': request}).data

        from products.models import Product, Category
        from users.models import TelegramUser

        return Response({
            'orders_by_status': stats_by_status,
            'orders_total': Order.objects.count(),
            'revenue': today_revenue,
            'products_count': Product.objects.count(),
            'categories_count': Category.objects.count(),
            'users_count': TelegramUser.objects.count(),
            'recent_orders': recent_data,
        })
