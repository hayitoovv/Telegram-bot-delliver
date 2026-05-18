from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='name_ru',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='Nomi (ru)'),
        ),
        migrations.AlterField(
            model_name='category',
            name='name',
            field=models.CharField(max_length=200, verbose_name='Nomi (uz)'),
        ),
        migrations.AddField(
            model_name='product',
            name='name_ru',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='Nomi (ru)'),
        ),
        migrations.AddField(
            model_name='product',
            name='description_ru',
            field=models.TextField(blank=True, default='', verbose_name='Tavsif (ru)'),
        ),
        migrations.AlterField(
            model_name='product',
            name='name',
            field=models.CharField(max_length=200, verbose_name='Nomi (uz)'),
        ),
        migrations.AlterField(
            model_name='product',
            name='description',
            field=models.TextField(blank=True, verbose_name='Tavsif (uz)'),
        ),
    ]
