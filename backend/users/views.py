import html
import logging
import threading
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import TelegramUser, ChatMessage, SiteConfig, Promotion
from .serializers import TelegramUserSerializer
from food_delivery.telegram_auth import verify_telegram_data_detailed, verify_user_request
from food_delivery.admin_auth import _valid_admin_ids

logger = logging.getLogger(__name__)


def _get_user_from_request(request):
    user_data, reason = verify_user_request(request)
    if user_data is None:
        # initData ham, user_token ham yo'q yoki yaroqsiz
        return None, None, Response(
            {'error': 'initData yaroqsiz', 'reason': reason or 'empty_init_data'},
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
    return user, user_data, None


class AuthView(APIView):
    def post(self, request):
        user, user_data, err = _get_user_from_request(request)
        if err:
            return err

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
            'is_admin': int(user.telegram_id) in _valid_admin_ids(),
        })


class ProfileView(APIView):
    """Foydalanuvchi ism/familiyasini tahrirlash."""

    def post(self, request):
        user, _user_data, err = _get_user_from_request(request)
        if err:
            return err

        first_name = (request.data.get('first_name') or '').strip()[:150]
        last_name = (request.data.get('last_name') or '').strip()[:150]

        if first_name:
            user.first_name = first_name
        user.last_name = last_name
        user.save(update_fields=['first_name', 'last_name'])
        return Response({
            'ok': True,
            'user': TelegramUserSerializer(user).data,
        })


class LogoutView(APIView):
    """Foydalanuvchi profilini tozalash (telefon, til default qiymatga)."""

    def post(self, request):
        user, _user_data, err = _get_user_from_request(request)
        if err:
            return err

        user.phone = ''
        user.language = 'uz'
        user.save(update_fields=['phone', 'language'])
        return Response({'ok': True})


class LanguageView(APIView):
    """Foydalanuvchi tilini o'zgartirish."""

    def post(self, request):
        user, _user_data, err = _get_user_from_request(request)
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


class PublicConfigView(APIView):
    """Mini app uchun ochiq config — auth shart emas."""
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        cfg = SiteConfig.get()
        return Response({
            'min_order_amount': cfg.min_order_amount,
            'delivery_fee': cfg.delivery_fee,
            'support_username': cfg.support_username,
            'yandex_maps_api_key': settings.YANDEX_MAPS_API_KEY,
        })


class PromotionListView(APIView):
    """Mini-app foydalanuvchilari uchun — barcha aksiyalar/elonlar ro'yxati."""

    def post(self, request):
        user_data, reason = verify_user_request(request)
        if user_data is None:
            return Response(
                {'error': 'initData yaroqsiz', 'reason': reason or 'empty_init_data'},
                status=403,
            )
        # Faqat yuborilgan elonlarni ko'rsatamiz (admin draft turibdi degan holat bo'lmasin)
        qs = Promotion.objects.filter(sent_at__isnull=False).order_by('-created_at')[:50]
        results = []
        for p in qs:
            img_url = None
            if p.image:
                img_url = request.build_absolute_uri(p.image.url)
            results.append({
                'id': p.id,
                'text': p.text,
                'image': img_url,
                'created_at': (p.sent_at or p.created_at).isoformat(),
            })
        return Response({'promotions': results})


class UserIssueTokenView(APIView):
    """Bot mini-app URL'iga qo'shish uchun signed user_token chiqaradi.
    Bot o'zini TELEGRAM_BOT_TOKEN orqali tasdiqlaydi (shared secret).
    Bu — Telegram initData yo'q clientlar uchun fallback auth mexanizmi."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        provided = (request.data.get('bot_secret') or '').strip()
        expected = (settings.TELEGRAM_BOT_TOKEN or '').strip()
        if not provided or provided != expected:
            return Response({'error': 'Forbidden'}, status=403)
        try:
            tg_id = int(request.data.get('tg_id') or 0)
        except (TypeError, ValueError):
            return Response({'error': "Noto'g'ri tg_id"}, status=400)
        if not tg_id:
            return Response({'error': 'tg_id kerak'}, status=400)
        from food_delivery.admin_auth import create_user_token
        return Response({'token': create_user_token(tg_id), 'expires_hours': 24})


class ClientDiagnosticsView(APIView):
    """Frontend initData bilan muammoga uchraganda diagnostika ma'lumotini loglash."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Faqat anonim ma'lumot — initData KO'RSATILMAYDI, faqat metadatasi
        d = request.data or {}
        logger.warning(
            "[CLIENT-DIAG] ua=%r ref=%r tg_init_len=%s tg_unsafe_keys=%s "
            "hash_present=%s hash_keys=%s cached=%s mem=%s lang=%s tg_id=%s url=%r",
            request.META.get('HTTP_USER_AGENT', '')[:200],
            request.META.get('HTTP_REFERER', '')[:200],
            d.get('tg_init_len'),
            d.get('tg_unsafe_keys'),
            d.get('hash_present'),
            d.get('hash_keys'),
            d.get('has_cache'),
            d.get('has_memory'),
            d.get('lang'),
            d.get('tg_id'),
            (d.get('url') or '')[:200],
        )
        return Response({'ok': True})


class ChatView(APIView):
    """Mini-app chat: user xabarini DB'ga saqlab, adminga forward qiladi."""

    def post(self, request):
        user, _user_data, err = _get_user_from_request(request)
        if err:
            return err

        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'error': 'Xabar bo\'sh'}, status=400)
        if len(text) > 2000:
            return Response({'error': 'Xabar juda uzun'}, status=400)

        # 1) DB'ga saqlash
        msg = ChatMessage.objects.create(user=user, sender='user', text=text)

        # 2) Admin(lar)ga inline "Ko'rish" tugmasi bilan yuborish
        bot_token = settings.TELEGRAM_BOT_TOKEN
        admin_ids = _valid_admin_ids()
        mini_app_url = (getattr(settings, 'MINI_APP_URL', '') or '').rstrip('/')
        if bot_token and admin_ids and mini_app_url:
            display_name = user.first_name or user.username or str(user.telegram_id)
            if user.last_name:
                display_name += f" {user.last_name}"
            chat_url = f"{mini_app_url}/?lang={user.language or 'uz'}&chat_user_id={user.telegram_id}"
            safe_name = html.escape(display_name)
            safe_text = html.escape(text)
            username_line = f"@{html.escape(user.username)}\n" if user.username else ""
            body = (
                f"💬 <b>{safe_name}</b>\n"
                f"{username_line}"
                f"\n{safe_text}"
            )
            def _forward():
                for admin_id in admin_ids:
                    try:
                        requests.post(
                            f"https://api.telegram.org/bot{bot_token}/sendMessage",
                            json={
                                'chat_id': admin_id,
                                'text': body,
                                'parse_mode': 'HTML',
                                'reply_markup': {
                                    'inline_keyboard': [[
                                        {'text': "💬 Ko'rish", 'web_app': {'url': chat_url}}
                                    ]]
                                },
                            },
                            timeout=10,
                        )
                    except requests.RequestException as e:
                        logger.error("Chat forward xato (admin %s): %s", admin_id, e)

            threading.Thread(target=_forward, daemon=True).start()

        return Response({
            'ok': True,
            'message': {
                'id': msg.id,
                'sender': msg.sender,
                'text': msg.text,
                'created_at': msg.created_at.isoformat(),
            },
        })


class ChatHistoryView(APIView):
    """Foydalanuvchining chat tarixi."""

    def post(self, request):
        user, _user_data, err = _get_user_from_request(request)
        if err:
            return err
        try:
            limit = min(500, max(10, int(request.query_params.get('limit') or 200)))
        except ValueError:
            limit = 200
        qs = user.chat_messages.all().order_by('-created_at')[:limit]
        messages = list(reversed(list(qs)))
        # admin'dan kelgan xabarlarni o'qilgan deb belgilash
        unread_ids = [m.id for m in messages if m.sender == 'admin' and not m.is_read]
        if unread_ids:
            ChatMessage.objects.filter(id__in=unread_ids).update(is_read=True)
        return Response({
            'messages': [{
                'id': m.id,
                'sender': m.sender,
                'text': m.text,
                'created_at': m.created_at.isoformat(),
                'is_read': m.is_read,
            } for m in messages],
        })
