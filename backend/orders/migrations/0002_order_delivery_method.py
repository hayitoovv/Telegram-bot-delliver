from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_method',
            field=models.CharField(
                choices=[('delivery', 'Yetkazib berish'), ('pickup', 'Olib ketish')],
                default='delivery',
                max_length=20,
                verbose_name='Servis turi',
            ),
        ),
    ]
