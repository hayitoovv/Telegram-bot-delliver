from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product


class ProductInline(admin.TabularInline):
    model = Product
    extra = 1
    fields = ['name', 'name_ru', 'price', 'image', 'is_active']
    show_change_link = True


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['thumb', 'name', 'product_count', 'is_active', 'order']
    list_display_links = ['thumb', 'name']
    list_editable = ['is_active', 'order']
    list_filter = ['is_active']
    search_fields = ['name']
    ordering = ['order', 'name']
    list_per_page = 30
    save_on_top = True
    inlines = [ProductInline]
    actions = ['activate', 'deactivate']

    fieldsets = (
        (None, {'fields': ('name', 'name_ru', 'image', 'is_active', 'order')}),
    )

    def thumb(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:42px;width:42px;object-fit:cover;border-radius:6px;" />',
                obj.image.url,
            )
        return format_html('<div style="height:42px;width:42px;background:#eee;border-radius:6px;"></div>')
    thumb.short_description = 'Rasm'

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Mahsulotlar'

    @admin.action(description="Faollashtirish")
    def activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Faolsizlantirish")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['thumb', 'name', 'category', 'price_fmt', 'is_active', 'created_at']
    list_display_links = ['thumb', 'name']
    list_editable = ['is_active']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    autocomplete_fields = ['category']
    ordering = ['category', 'name']
    list_per_page = 30
    list_select_related = ['category']
    save_on_top = True
    date_hierarchy = 'created_at'
    actions = ['activate', 'deactivate']

    fieldsets = (
        ('Asosiy', {'fields': ('category', 'name', 'name_ru', 'description', 'description_ru')}),
        ('Narx va rasm', {'fields': ('price', 'image')}),
        ('Holat', {'fields': ('is_active',)}),
    )

    def thumb(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="height:50px;width:50px;object-fit:cover;border-radius:6px;" />',
                obj.image.url,
            )
        return format_html('<div style="height:50px;width:50px;background:#eee;border-radius:6px;"></div>')
    thumb.short_description = 'Rasm'

    def price_fmt(self, obj):
        return f"{obj.price:,} UZS"
    price_fmt.short_description = 'Narxi'
    price_fmt.admin_order_field = 'price'

    @admin.action(description="Faollashtirish")
    def activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Faolsizlantirish")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)
