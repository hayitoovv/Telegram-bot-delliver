from django.db import models
from users.models import TelegramUser
from products.models import Product


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        ACCEPTED = 'accepted', 'Qabul qilindi'
        PREPARING = 'preparing', 'Tayyorlanmoqda'
        DELIVERING = 'delivering', 'Yetkazilmoqda'
        DELIVERED = 'delivered', 'Yetkazildi'
        CANCELLED = 'cancelled', 'Bekor qilindi'

    class DeliveryMethod(models.TextChoices):
        DELIVERY = 'delivery', 'Yetkazib berish'
        PICKUP = 'pickup', 'Olib ketish'

    user = models.ForeignKey(
        TelegramUser, on_delete=models.CASCADE,
        related_name='orders', verbose_name="Foydalanuvchi"
    )
    total_price = models.PositiveIntegerField(verbose_name="Umumiy narx (UZS)")
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.PENDING, verbose_name="Holat"
    )
    delivery_method = models.CharField(
        max_length=20, choices=DeliveryMethod.choices,
        default=DeliveryMethod.DELIVERY, verbose_name="Servis turi"
    )
    address = models.TextField(verbose_name="Manzil")
    latitude = models.FloatField(null=True, blank=True, verbose_name="Kenglik")
    longitude = models.FloatField(null=True, blank=True, verbose_name="Uzunlik")
    comment = models.TextField(blank=True, default='', verbose_name="Izoh")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")

    class Meta:
        verbose_name = "Buyurtma"
        verbose_name_plural = "Buyurtmalar"
        ordering = ['-created_at']

    def __str__(self):
        return f"Buyurtma #{self.id} - {self.user.first_name} - {self.total_price:,} UZS"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE,
        related_name='items', verbose_name="Buyurtma"
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL,
        null=True, verbose_name="Mahsulot"
    )
    product_name = models.CharField(max_length=200, verbose_name="Mahsulot nomi")
    quantity = models.PositiveIntegerField(verbose_name="Soni")
    price = models.PositiveIntegerField(verbose_name="Narxi (UZS)")

    class Meta:
        verbose_name = "Buyurtma elementi"
        verbose_name_plural = "Buyurtma elementlari"

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"

    @property
    def subtotal(self):
        return self.price * self.quantity
