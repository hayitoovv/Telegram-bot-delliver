from django.urls import path
from . import views
from . import admin_views

urlpatterns = [
    path('auth/', views.AuthView.as_view(), name='auth'),
    path('config/', views.PublicConfigView.as_view(), name='public-config'),
    path('chat/', views.ChatView.as_view(), name='chat'),
    path('chat/history/', views.ChatHistoryView.as_view(), name='chat-history'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('language/', views.LanguageView.as_view(), name='language'),

    # Admin
    path('admin/users/', admin_views.AdminUserListView.as_view()),
    path('admin/users/<int:pk>/', admin_views.AdminUserDetailView.as_view()),
    path('admin/issue-token/', admin_views.AdminIssueTokenView.as_view()),
    path('bot/admin-ids/', admin_views.BotAdminIdsView.as_view()),
    path('admin/chat/users/', admin_views.AdminChatUsersView.as_view()),
    path('admin/chat/<int:pk>/', admin_views.AdminChatHistoryView.as_view()),
    path('admin/chat/<int:pk>/send/', admin_views.AdminChatSendView.as_view()),
    path('admin/settings/', admin_views.AdminSettingsView.as_view()),
    path('admin/admins/', admin_views.AdminAdminsListView.as_view()),
    path('admin/admins/add/', admin_views.AdminAdminAddView.as_view()),
    path('admin/admins/<int:pk>/remove/', admin_views.AdminAdminRemoveView.as_view()),
]
