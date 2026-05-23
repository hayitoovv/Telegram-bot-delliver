from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_delivery_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='restaurant_comment',
            field=models.TextField(blank=True, default='', verbose_name='Restoran uchun izoh'),
        ),
        migrations.AlterField(
            model_name='order',
            name='comment',
            field=models.TextField(blank=True, default='', verbose_name='Kuryer uchun izoh'),
        ),
    ]
