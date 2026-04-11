from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'quantity', 'price']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total_price', 'status', 'address', 'created_at']
    list_filter = ['status', 'created_at']
    list_editable = ['status']
    search_fields = ['user__first_name', 'user__telegram_id', 'address']
    readonly_fields = ['user', 'total_price', 'address', 'latitude', 'longitude', 'created_at']
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'
