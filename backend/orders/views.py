from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from .models import Order, OrderItem
from .serializers import OrderCreateSerializer, OrderSerializer
from products.models import Product
from users.models import TelegramUser
from food_delivery.telegram_auth import verify_telegram_data_detailed
from food_delivery.notifications import notify_admins_new_order, notify_user_new_order


def _auth_error_response(reason: str):
    return Response(
        {'error': 'Autentifikatsiya xatosi', 'reason': reason},
        status=status.HTTP_403_FORBIDDEN,
    )


class OrderCreateView(APIView):
    """Yangi buyurtma yaratish."""

    def post(self, request):
        # Foydalanuvchini tekshirish
        init_data = request.data.get('initData', '')
        user_data, reason = verify_telegram_data_detailed(init_data)
        if user_data is None:
            return _auth_error_response(reason)

        try:
            user = TelegramUser.objects.get(telegram_id=user_data['id'])
        except TelegramUser.DoesNotExist:
            return Response(
                {'error': 'Foydalanuvchi topilmadi. Avval /start bosing.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if not data['items']:
            return Response(
                {'error': 'Savat bo\'sh'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mahsulotlarni tekshirish va narxlarni hisoblash
        total_price = 0
        order_items = []

        for item_data in data['items']:
            try:
                product = Product.objects.get(id=item_data['product_id'], is_active=True)
            except Product.DoesNotExist:
                return Response(
                    {'error': f'Mahsulot topilmadi: ID {item_data["product_id"]}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            subtotal = product.price * item_data['quantity']
            total_price += subtotal
            order_items.append({
                'product': product,
                'product_name': product.name,
                'quantity': item_data['quantity'],
                'price': product.price,
            })

        # Minimal summa tekshirish
        if total_price < settings.MIN_ORDER_AMOUNT:
            return Response(
                {'error': f'Minimal buyurtma summasi: {settings.MIN_ORDER_AMOUNT:,} UZS'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buyurtma yaratish
        order = Order.objects.create(
            user=user,
            total_price=total_price,
            delivery_method=data.get('delivery_method', 'delivery'),
            address=data['address'],
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            comment=data.get('comment', ''),
        )

        for item in order_items:
            OrderItem.objects.create(order=order, **item)

        # Xabarnomalar
        notify_admins_new_order(order)
        notify_user_new_order(order)

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )


class OrderListView(APIView):
    """Foydalanuvchi buyurtmalari."""

    def post(self, request):
        init_data = request.data.get('initData', '')
        user_data, reason = verify_telegram_data_detailed(init_data)
        if user_data is None:
            return _auth_error_response(reason)

        try:
            user = TelegramUser.objects.get(telegram_id=user_data['id'])
        except TelegramUser.DoesNotExist:
            return Response({'orders': []})

        orders = Order.objects.filter(user=user)[:20]
        return Response({'orders': OrderSerializer(orders, many=True).data})
