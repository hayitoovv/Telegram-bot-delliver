from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_merge_0002_chatmessage_0002_telegramuser_language'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramuser',
            name='is_admin',
            field=models.BooleanField(default=False, verbose_name='Admin'),
        ),
        migrations.CreateModel(
            name='SiteConfig',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('min_order_amount', models.PositiveIntegerField(default=40000, verbose_name='Minimal buyurtma summasi (UZS)')),
                ('delivery_fee', models.PositiveIntegerField(default=0, verbose_name='Yetkazib berish narxi (UZS)')),
                ('support_username', models.CharField(blank=True, default='', max_length=64, verbose_name="Qo'llab-quvvatlash username")),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Sayt sozlamasi',
                'verbose_name_plural': 'Sayt sozlamalari',
            },
        ),
    ]
