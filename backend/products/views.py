from rest_framework import generics
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True)
    pagination_class = None  # Kategoriya soni kam — sahifalashga hojat yo'q

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['lang'] = self.request.query_params.get('lang', 'uz')
        return ctx


class ProductListView(generics.ListAPIView):
    """Mini-app menyuga barcha faol mahsulotlarni qaytaradi — sahifalashsiz.
    Default PAGE_SIZE=50 frontend'ni 1-sahifaga cheklaydi, natijada
    50-mahsulotdan keyingi kategoriyalar bo'sh ko'rinardi."""
    serializer_class = ProductSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True)
        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['lang'] = self.request.query_params.get('lang', 'uz')
        return ctx
