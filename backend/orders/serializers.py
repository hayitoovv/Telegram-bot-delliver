from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    items = OrderItemCreateSerializer(many=True)
    address = serializers.CharField()
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_method = serializers.ChoiceField(
        choices=[('delivery', 'delivery'), ('pickup', 'pickup')],
        required=False, default='delivery',
    )


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.IntegerField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'quantity', 'price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'total_price', 'status', 'delivery_method', 'address', 'comment', 'items', 'created_at']
