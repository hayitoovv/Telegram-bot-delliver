from rest_framework import serializers
from .models import Category, Product


class ProductSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'image', 'category']

    def get_name(self, obj):
        lang = self.context.get('lang', 'uz')
        if lang == 'ru' and obj.name_ru:
            return obj.name_ru
        return obj.name

    def get_description(self, obj):
        lang = self.context.get('lang', 'uz')
        if lang == 'ru' and obj.description_ru:
            return obj.description_ru
        return obj.description


class CategorySerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'image']

    def get_name(self, obj):
        lang = self.context.get('lang', 'uz')
        if lang == 'ru' and obj.name_ru:
            return obj.name_ru
        return obj.name
