from django.contrib import admin
from .models import TelegramUser


@admin.register(TelegramUser)
class TelegramUserAdmin(admin.ModelAdmin):
    list_display = ['telegram_id', 'first_name', 'last_name', 'username', 'phone', 'orders_count', 'created_at']
    list_display_links = ['telegram_id', 'first_name']
    search_fields = ['first_name', 'last_name', 'username', 'telegram_id', 'phone']
    readonly_fields = ['telegram_id', 'created_at']
    ordering = ['-created_at']
    list_per_page = 30
    date_hierarchy = 'created_at'

    def orders_count(self, obj):
        return obj.orders.count()
    orders_count.short_description = 'Buyurtmalar'
