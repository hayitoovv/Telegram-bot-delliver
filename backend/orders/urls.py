from django.urls import path
from . import views
from . import admin_views

urlpatterns = [
    path('order/', views.OrderCreateView.as_view(), name='order-create'),
    path('orders/', views.OrderListView.as_view(), name='order-list'),
    path('order/cancel/', views.OrderCancelView.as_view(), name='order-cancel'),

    # Admin
    path('admin/dashboard/', admin_views.AdminDashboardView.as_view()),
    path('admin/orders/', admin_views.AdminOrderListView.as_view()),
    path('admin/orders/<int:pk>/', admin_views.AdminOrderDetailView.as_view()),
    path('admin/orders/bulk-status/', admin_views.AdminOrderBulkStatusView.as_view()),
]
