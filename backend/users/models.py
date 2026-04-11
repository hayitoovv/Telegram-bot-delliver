from django.db import models


class TelegramUser(models.Model):
    telegram_id = models.BigIntegerField(unique=True, verbose_name="Telegram ID")
    first_name = models.CharField(max_length=150, verbose_name="Ism")
    last_name = models.CharField(max_length=150, blank=True, default='', verbose_name="Familiya")
    username = models.CharField(max_length=150, blank=True, default='', verbose_name="Username")
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name="Telefon")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

    def __str__(self):
        return f"{self.first_name} ({self.telegram_id})"
