from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_telegramuser_is_super_admin'),
    ]

    operations = [
        migrations.CreateModel(
            name='Promotion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(verbose_name='Matn')),
                ('image', models.ImageField(blank=True, null=True, upload_to='promotions/', verbose_name='Rasm')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan')),
                ('sent_at', models.DateTimeField(blank=True, null=True, verbose_name='Yuborilgan vaqt')),
                ('sent_count', models.PositiveIntegerField(default=0, verbose_name='Yuborildi')),
                ('failed_count', models.PositiveIntegerField(default=0, verbose_name='Xato')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotions_created', to='users.telegramuser', verbose_name='Yaratuvchi admin')),
            ],
            options={
                'verbose_name': 'Aksiya/Bildirishnoma',
                'verbose_name_plural': 'Aksiyalar va bildirishnomalar',
                'ordering': ['-created_at'],
            },
        ),
    ]
