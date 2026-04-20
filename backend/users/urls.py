from django.urls import path
from . import views

urlpatterns = [
    path('auth/', views.AuthView.as_view(), name='auth'),
    path('chat/', views.ChatView.as_view(), name='chat'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('language/', views.LanguageView.as_view(), name='language'),
]
