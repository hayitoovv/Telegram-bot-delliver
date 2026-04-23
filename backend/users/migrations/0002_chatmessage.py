from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sender', models.CharField(choices=[('user', 'Foydalanuvchi'), ('admin', 'Admin')], max_length=10, verbose_name='Kimdan')),
                ('text', models.TextField(verbose_name='Matn')),
                ('is_read', models.BooleanField(default=False, verbose_name="O'qilgan")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='chat_messages', to='users.telegramuser', verbose_name='Foydalanuvchi')),
            ],
            options={
                'verbose_name': 'Chat xabar',
                'verbose_name_plural': 'Chat xabarlar',
                'ordering': ['created_at'],
                'indexes': [models.Index(fields=['user', 'created_at'], name='users_chatm_user_id_idx')],
            },
        ),
    ]
