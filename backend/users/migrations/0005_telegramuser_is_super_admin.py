from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_admin_and_config'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramuser',
            name='is_super_admin',
            field=models.BooleanField(default=False, verbose_name='Super admin'),
        ),
    ]
