from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_chatmessage'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramuser',
            name='language',
            field=models.CharField(
                choices=[('uz', "O'zbek"), ('ru', 'Русский')],
                default='uz',
                max_length=2,
                verbose_name='Til',
            ),
        ),
    ]
