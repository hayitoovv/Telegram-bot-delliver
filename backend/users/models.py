from django.db import models


class TelegramUser(models.Model):
    telegram_id = models.BigIntegerField(unique=True, verbose_name="Telegram ID")
    first_name = models.CharField(max_length=150, verbose_name="Ism")
    last_name = models.CharField(max_length=150, blank=True, default='', verbose_name="Familiya")
    username = models.CharField(max_length=150, blank=True, default='', verbose_name="Username")
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name="Telefon")
    language = models.CharField(max_length=2, choices=[('uz', "O'zbek"), ('ru', 'Русский')], default='uz', verbose_name="Til")
    is_admin = models.BooleanField(default=False, verbose_name="Admin")
    is_super_admin = models.BooleanField(default=False, verbose_name="Super admin")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

    def __str__(self):
        return f"{self.first_name} ({self.telegram_id})"


class SiteConfig(models.Model):
    """Singleton — sayt sozlamalari."""
    min_order_amount = models.PositiveIntegerField(default=40000, verbose_name="Minimal buyurtma summasi (UZS)")
    delivery_fee = models.PositiveIntegerField(default=0, verbose_name="Yetkazib berish narxi (UZS)")
    support_username = models.CharField(max_length=64, blank=True, default='', verbose_name="Qo'llab-quvvatlash username")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sayt sozlamasi"
        verbose_name_plural = "Sayt sozlamalari"

    def __str__(self):
        return "Sayt sozlamalari"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ChatMessage(models.Model):
    class Sender(models.TextChoices):
        USER = 'user', 'Foydalanuvchi'
        ADMIN = 'admin', 'Admin'

    user = models.ForeignKey(
        TelegramUser, on_delete=models.CASCADE,
        related_name='chat_messages', verbose_name='Foydalanuvchi',
    )
    sender = models.CharField(max_length=10, choices=Sender.choices, verbose_name='Kimdan')
    text = models.TextField(verbose_name='Matn')
    is_read = models.BooleanField(default=False, verbose_name="O'qilgan")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Chat xabar'
        verbose_name_plural = 'Chat xabarlar'
        ordering = ['created_at']
        indexes = [models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return f"[{self.sender}] {self.user_id}: {self.text[:40]}"
