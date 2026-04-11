from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import TelegramUser
from .serializers import TelegramUserSerializer
from food_delivery.telegram_auth import verify_telegram_data


class AuthView(APIView):
    """Telegram WebApp initData orqali autentifikatsiya."""

    def post(self, request):
        init_data = request.data.get('initData', '')
        if not init_data:
            return Response(
                {'error': 'initData talab qilinadi'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_data = verify_telegram_data(init_data)
        if user_data is None:
            return Response(
                {'error': 'initData yaroqsiz'},
                status=status.HTTP_403_FORBIDDEN
            )

        user, created = TelegramUser.objects.get_or_create(
            telegram_id=user_data['id'],
            defaults={
                'first_name': user_data.get('first_name', ''),
                'last_name': user_data.get('last_name', ''),
                'username': user_data.get('username', ''),
            }
        )

        if not created:
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.username = user_data.get('username', user.username)
            user.save()

        return Response({
            'user': TelegramUserSerializer(user).data,
            'is_new': created,
        })
