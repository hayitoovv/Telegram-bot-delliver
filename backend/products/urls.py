from django.urls import path
from . import views
from . import admin_views

urlpatterns = [
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('products/', views.ProductListView.as_view(), name='product-list'),

    # Admin
    path('admin/categories/', admin_views.AdminCategoryListView.as_view()),
    path('admin/categories/<int:pk>/', admin_views.AdminCategoryDetailView.as_view()),
    path('admin/categories/bulk/', admin_views.AdminCategoryBulkView.as_view()),
    path('admin/products/', admin_views.AdminProductListView.as_view()),
    path('admin/products/<int:pk>/', admin_views.AdminProductDetailView.as_view()),
    path('admin/products/bulk/', admin_views.AdminProductBulkView.as_view()),
]
