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
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(user__first_name__icontains=q) | qs.filter(
                user__username__icontains=q) | qs.filter(id__icontains=q) | qs.filter(
                address__icontains=q)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

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
        return Response({
            'results': OrderSerializer(qs, many=True, context={'request': request}).data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })


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
        import logging
        lgr = logging.getLogger(__name__)
        try:
            user, err = check_admin(request)
            if err:
                lgr.error("[PATCH-ORDER] check_admin FAILED for pk=%s", pk)
                return err
            try:
                order = Order.objects.get(pk=pk)
            except Order.DoesNotExist:
                lgr.error("[PATCH-ORDER] order %s NOT FOUND", pk)
                return Response({'error': 'Topilmadi'}, status=404)

            new_status = request.data.get('status')
            lgr.error("[PATCH-ORDER] pk=%s new_status=%s allowed=%s",
                      pk, new_status, new_status in ALLOWED_STATUSES)
            if new_status and new_status in ALLOWED_STATUSES:
                order.status = new_status
                order.save(update_fields=['status'])
                lgr.error("[PATCH-ORDER] SAVED pk=%s status=%s", pk, new_status)
                return Response(OrderSerializer(order, context={'request': request}).data)
            return Response({'error': "Noto'g'ri status"}, status=400)
        except Exception as e:
            lgr.error("[PATCH-ORDER] EXCEPTION pk=%s: %s", pk, e, exc_info=True)
            raise


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

        from django.utils import timezone
        from datetime import timedelta
        from django.db.models.functions import TruncDate
        from products.models import Product, Category
        from users.models import TelegramUser
        from orders.models import OrderItem

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_ago = today_start - timedelta(days=13)

        # Status counts
        stats_by_status = {s[0]: 0 for s in Order.Status.choices}
        for row in Order.objects.values('status').annotate(count=Count('id')):
            stats_by_status[row['status']] = row['count']

        # Revenue (faqat yakunlangan yoki jarayonda bo'lganlar)
        successful_statuses = ['accepted', 'preparing', 'delivering', 'delivered']
        revenue_total = Order.objects.filter(status__in=successful_statuses)\
            .aggregate(total=Sum('total_price'))['total'] or 0
        revenue_today = Order.objects.filter(
            status__in=successful_statuses, created_at__gte=today_start
        ).aggregate(total=Sum('total_price'))['total'] or 0
        revenue_yesterday = Order.objects.filter(
            status__in=successful_statuses,
            created_at__gte=yesterday_start, created_at__lt=today_start
        ).aggregate(total=Sum('total_price'))['total'] or 0

        # Orders today vs yesterday
        orders_today = Order.objects.filter(created_at__gte=today_start).count()
        orders_yesterday = Order.objects.filter(
            created_at__gte=yesterday_start, created_at__lt=today_start
        ).count()

        # Avg order value
        avg_order = Order.objects.filter(status__in=successful_statuses)\
            .aggregate(a=Sum('total_price'), c=Count('id'))
        avg_order_value = (avg_order['a'] / avg_order['c']) if avg_order['c'] else 0

        # Orders by day (14 kun)
        daily = (
            Order.objects
            .filter(created_at__gte=week_ago)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(count=Count('id'), revenue=Sum('total_price'))
            .order_by('day')
        )
        daily_map = {r['day'].isoformat(): {'count': r['count'], 'revenue': r['revenue'] or 0} for r in daily}
        orders_by_day = []
        for i in range(14):
            d = (week_ago + timedelta(days=i)).date().isoformat()
            row = daily_map.get(d, {'count': 0, 'revenue': 0})
            orders_by_day.append({'date': d, 'count': row['count'], 'revenue': row['revenue']})

        # Top products (5)
        top_products_raw = (
            OrderItem.objects
            .values('product_id', 'product_name')
            .annotate(ordered=Sum('quantity'), revenue=Sum('price'))
            .order_by('-ordered')[:5]
        )
        top_products = [
            {'id': r['product_id'], 'name': r['product_name'],
             'ordered': r['ordered'] or 0, 'revenue': r['revenue'] or 0}
            for r in top_products_raw
        ]

        # Top users (5)
        top_users_raw = (
            TelegramUser.objects
            .annotate(orders_count=Count('orders'), spent=Sum('orders__total_price'))
            .filter(orders_count__gt=0)
            .order_by('-orders_count')[:5]
        )
        top_users = [
            {
                'id': u.id,
                'telegram_id': u.telegram_id,
                'name': (u.first_name or '') + ((' ' + u.last_name) if u.last_name else ''),
                'username': u.username,
                'orders_count': u.orders_count,
                'spent': u.spent or 0,
            } for u in top_users_raw
        ]

        # Recent orders
        recent = Order.objects.select_related('user').order_by('-created_at')[:8]
        recent_data = OrderSerializer(recent, many=True, context={'request': request}).data

        return Response({
            'orders_by_status': stats_by_status,
            'orders_total': Order.objects.count(),
            'orders_today': orders_today,
            'orders_yesterday': orders_yesterday,
            'revenue': revenue_total,
            'revenue_today': revenue_today,
            'revenue_yesterday': revenue_yesterday,
            'avg_order_value': avg_order_value,
            'products_count': Product.objects.count(),
            'categories_count': Category.objects.count(),
            'users_count': TelegramUser.objects.count(),
            'orders_by_day': orders_by_day,
            'top_products': top_products,
            'top_users': top_users,
            'recent_orders': recent_data,
        })
