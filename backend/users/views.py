import logging
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import TelegramUser
from .serializers import TelegramUserSerializer
from food_delivery.telegram_auth import verify_telegram_data, verify_telegram_data_detailed

logger = logging.getLogger(__name__)


def _get_user_from_request(request):
    init_data = request.data.get('initData', '')
    if not init_data:
        return None, Response({'error': 'initData talab qilinadi'}, status=400)

    user_data, reason = verify_telegram_data_detailed(init_data)
    if user_data is None:
        return None, Response(
            {'error': 'initData yaroqsiz', 'reason': reason},
            status=403,
        )

    user, _ = TelegramUser.objects.get_or_create(
        telegram_id=user_data['id'],
        defaults={
            'first_name': user_data.get('first_name', ''),
            'last_name': user_data.get('last_name', ''),
            'username': user_data.get('username', ''),
        },
    )
    return user, None


class AuthView(APIView):
    def post(self, request):
        user, err = _get_user_from_request(request)
        if err:
            return err

        user_data = verify_telegram_data(request.data.get('initData', ''))
        user.first_name = user_data.get('first_name', user.first_name)
        user.last_name = user_data.get('last_name', user.last_name)
        user.username = user_data.get('username', user.username)

        phone = (request.data.get('phone') or '').strip()
        if phone and phone != user.phone:
            user.phone = phone

        user.save()

        return Response({
            'user': TelegramUserSerializer(user).data,
            'is_new': False,
        })


class LanguageView(APIView):
    """Foydalanuvchi tilini o'zgartirish."""

    def post(self, request):
        user, err = _get_user_from_request(request)
        if err:
            return err

        lang = request.data.get('language', '').strip()
        if lang not in ('uz', 'ru'):
            return Response({'error': 'Noto\'g\'ri til'}, status=400)

        user.language = lang
        user.save(update_fields=['language'])
        return Response({'ok': True, 'language': lang})

    def get(self, request):
        telegram_id = request.query_params.get('telegram_id')
        if not telegram_id:
            return Response({'error': 'telegram_id kerak'}, status=400)
        try:
            user = TelegramUser.objects.get(telegram_id=telegram_id)
            return Response({'language': user.language})
        except TelegramUser.DoesNotExist:
            return Response({'language': 'uz'})


class ChatView(APIView):
    """Mini-app chat xabarini adminga yo'naltiradi."""

    def post(self, request):
        user, err = _get_user_from_request(request)
        if err:
            return err

        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'error': 'Xabar bo\'sh'}, status=400)
        if len(text) > 2000:
            return Response({'error': 'Xabar juda uzun'}, status=400)

        bot_token = settings.TELEGRAM_BOT_TOKEN
        admin_ids = [i for i in settings.TELEGRAM_ADMIN_CHAT_IDS if i.strip()]
        if not bot_token or not admin_ids:
            logger.error("Admin chat: bot token yoki admin ID sozlanmagan")
            return Response({'error': 'Xizmat vaqtincha mavjud emas'}, status=503)

        display_name = user.first_name or user.username or str(user.telegram_id)
        if user.last_name:
            display_name += f" {user.last_name}"

        def utf16len(s: str) -> int:
            return len(s.encode('utf-16-le')) // 2

        # Build text and entities (offsets in UTF-16 units per Telegram spec)
        body = ""
        entities = []

        header_text = "Mini-app chatdan yangi xabar"
        body += "💬 "
        entities.append({"type": "bold", "offset": utf16len(body), "length": utf16len(header_text)})
        body += header_text + "\n\n"

        body += "👤 "
        name_offset = utf16len(body)
        body += display_name
        entities.append({
            "type": "text_mention",
            "offset": name_offset,
            "length": utf16len(display_name),
            "user": {
                "id": int(user.telegram_id),
                "first_name": user.first_name or display_name,
                "is_bot": False,
            },
        })
        body += "\n"

        if user.username:
            body += f"📱 @{user.username}\n"
        if user.phone:
            body += f"☎️ {user.phone}\n"
        body += f"🆔 {user.telegram_id}\n\n"
        body += f"💭 {text}\n\n"
        body += "↩️ Javob berish uchun shu xabarga reply qiling"

        sent_ok = False
        for admin_id in admin_ids:
            try:
                resp = requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": int(admin_id),
                        "text": body,
                        "entities": entities,
                    },
                    timeout=10,
                )
                if resp.ok:
                    sent_ok = True
                else:
                    logger.warning("Telegram sendMessage fail: %s", resp.text)
            except requests.RequestException as e:
                logger.error("Telegram forward xato: %s", e)

        if not sent_ok:
            return Response({'error': 'Xabar yuborilmadi'}, status=502)

        return Response({'ok': True})
