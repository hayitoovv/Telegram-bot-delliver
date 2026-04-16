from django.contrib import admin
from django.utils.html import format_html
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'quantity', 'price', 'subtotal_fmt']
    fields = ['product_name', 'quantity', 'price', 'subtotal_fmt']
    can_delete = False

    def subtotal_fmt(self, obj):
        return f"{obj.subtotal:,} UZS" if obj.pk else "-"
    subtotal_fmt.short_description = 'Jami'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_name', 'items_count', 'total_fmt', 'status_badge', 'short_address', 'created_at']
    list_display_links = ['id', 'user_name']
    list_filter = ['status', 'created_at']
    search_fields = ['id', 'user__first_name', 'user__username', 'user__telegram_id', 'address']
    readonly_fields = ['user', 'total_price', 'address', 'latitude', 'longitude', 'map_link', 'comment', 'created_at', 'updated_at']
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'
    list_per_page = 30
    list_select_related = ['user']
    save_on_top = True
    actions = ['mark_accepted', 'mark_preparing', 'mark_delivering', 'mark_delivered', 'mark_cancelled']

    fieldsets = (
        ('Buyurtma', {'fields': ('status', 'total_price', 'created_at', 'updated_at')}),
        ('Foydalanuvchi', {'fields': ('user',)}),
        ('Yetkazish', {'fields': ('address', 'latitude', 'longitude', 'map_link', 'comment')}),
    )

    def user_name(self, obj):
        return obj.user.first_name or obj.user.username or obj.user.telegram_id
    user_name.short_description = 'Foydalanuvchi'

    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Mahsulotlar'

    def total_fmt(self, obj):
        return f"{obj.total_price:,} UZS"
    total_fmt.short_description = 'Jami'
    total_fmt.admin_order_field = 'total_price'

    def short_address(self, obj):
        return (obj.address[:50] + '…') if len(obj.address) > 50 else obj.address
    short_address.short_description = 'Manzil'

    def status_badge(self, obj):
        colors = {
            'pending': '#f39c12',
            'accepted': '#3498db',
            'preparing': '#9b59b6',
            'delivering': '#1abc9c',
            'delivered': '#2ecc71',
            'cancelled': '#e74c3c',
        }
        color = colors.get(obj.status, '#7f8c8d')
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;border-radius:10px;font-size:11px;">{}</span>',
            color, obj.get_status_display(),
        )
    status_badge.short_description = 'Holat'
    status_badge.admin_order_field = 'status'

    def map_link(self, obj):
        if obj.latitude and obj.longitude:
            url = f"https://www.openstreetmap.org/?mlat={obj.latitude}&mlon={obj.longitude}#map=17/{obj.latitude}/{obj.longitude}"
            return format_html('<a href="{}" target="_blank">🗺️ Xaritada ochish</a>', url)
        return '-'
    map_link.short_description = 'Xarita'

    @admin.action(description="Holat → Qabul qilindi")
    def mark_accepted(self, request, queryset):
        queryset.update(status=Order.Status.ACCEPTED)

    @admin.action(description="Holat → Tayyorlanmoqda")
    def mark_preparing(self, request, queryset):
        queryset.update(status=Order.Status.PREPARING)

    @admin.action(description="Holat → Yetkazilmoqda")
    def mark_delivering(self, request, queryset):
        queryset.update(status=Order.Status.DELIVERING)

    @admin.action(description="Holat → Yetkazildi")
    def mark_delivered(self, request, queryset):
        queryset.update(status=Order.Status.DELIVERED)

    @admin.action(description="Holat → Bekor qilindi")
    def mark_cancelled(self, request, queryset):
        queryset.update(status=Order.Status.CANCELLED)
