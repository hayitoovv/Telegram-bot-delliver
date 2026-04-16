from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nomi (uz)")
    name_ru = models.CharField(max_length=200, blank=True, default='', verbose_name="Nomi (ru)")
    image = models.ImageField(upload_to='categories/', blank=True, null=True, verbose_name="Rasm")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib")

    class Meta:
        verbose_name = "Kategoriya"
        verbose_name_plural = "Kategoriyalar"
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE,
        related_name='products', verbose_name="Kategoriya"
    )
    name = models.CharField(max_length=200, verbose_name="Nomi (uz)")
    name_ru = models.CharField(max_length=200, blank=True, default='', verbose_name="Nomi (ru)")
    description = models.TextField(blank=True, verbose_name="Tavsif (uz)")
    description_ru = models.TextField(blank=True, default='', verbose_name="Tavsif (ru)")
    price = models.PositiveIntegerField(verbose_name="Narxi (UZS)")
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name="Rasm")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Mahsulot"
        verbose_name_plural = "Mahsulotlar"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} - {self.price:,} UZS"
