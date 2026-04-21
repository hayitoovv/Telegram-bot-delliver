from django.urls import path
from . import views

urlpatterns = [
    path('order/', views.OrderCreateView.as_view(), name='order-create'),
    path('orders/', views.OrderListView.as_view(), name='order-list'),
    path('order/cancel/', views.OrderCancelView.as_view(), name='order-cancel'),
]
