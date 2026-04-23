"""Admin paneli uchun User CRUD."""
import logging
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Max
from django.conf import settings

from .models import TelegramUser, ChatMessage
from .serializers import TelegramUserSerializer
from food_delivery.admin_auth import check_admin, create_admin_token, _valid_admin_ids
from food_delivery.telegram_auth import verify_telegram_data_detailed

logger = logging.getLogger(__name__)


class AdminUserListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        user, err = check_admin(request)
        if err:
            return err

        from django.db.models import Sum
        qs = (TelegramUser.objects
              .annotate(orders_count=Count('orders'), spent=Sum('orders__total_price'))
              .order_by('-created_at'))
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(first_name__icontains=q) | qs.filter(
                last_name__icontains=q) | qs.filter(username__icontains=q) | qs.filter(
                phone__icontains=q) | qs.filter(telegram_id__icontains=q)

        total = qs.count()
        try:
            page = max(1, int(request.query_params.get('page') or 1))
        except ValueError:
            page = 1
        try:
            per_page = min(200, max(10, int(request.query_params.get('per_page') or 30)))
        except ValueError:
            per_page = 30
        start = (page - 1) * per_page
        qs = qs[start:start + per_page]

        data = []
        for u in qs:
            d = TelegramUserSerializer(u).data
            d['orders_count'] = u.orders_count
            d['spent'] = u.spent or 0
            d['created_at'] = u.created_at.isoformat()
            data.append(d)
        return Response({
            'results': data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })


class AdminUserDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        try:
            u = TelegramUser.objects.get(pk=pk)
        except TelegramUser.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=404)
        data = TelegramUserSerializer(u).data
        data['created_at'] = u.created_at.isoformat()

        from django.db.models import Sum
        from orders.serializers import OrderSerializer
        orders_qs = u.orders.prefetch_related('items').order_by('-created_at')[:30]
        data['orders_count'] = u.orders.count()
        data['spent'] = u.orders.aggregate(s=Sum('total_price'))['s'] or 0
        data['orders'] = OrderSerializer(orders_qs, many=True, context={'request': request}).data
        return Response(data)


class AdminChatUsersView(APIView):
    authentication_classes = []
    permission_classes = []

    def _list(self, request):
        user, err = check_admin(request)
        if err:
            return err
        qs = (TelegramUser.objects
              .annotate(last_msg_at=Max('chat_messages__created_at'))
              .filter(last_msg_at__isnull=False)
              .order_by('-last_msg_at'))[:80]
        data = []
        for u in qs:
            last = u.chat_messages.order_by('-created_at').first()
            unread = u.chat_messages.filter(sender='user', is_read=False).count()
            data.append({
                'id': u.id,
                'telegram_id': u.telegram_id,
                'name': (u.first_name or '') + ((' ' + u.last_name) if u.last_name else ''),
                'username': u.username,
                'phone': u.phone,
                'last_message': last.text if last else '',
                'last_sender': last.sender if last else None,
                'last_at': last.created_at.isoformat() if last else None,
                'unread': unread,
            })
        return Response({'users': data})

    def get(self, request):
        return self._list(request)

    def post(self, request):
        return self._list(request)


class AdminChatHistoryView(APIView):
    authentication_classes = []
    permission_classes = []

    def _resolve_target(self, pk, tg_id):
        if tg_id:
            try:
                return TelegramUser.objects.get(telegram_id=tg_id), None
            except TelegramUser.DoesNotExist:
                return None, Response({'error': 'Topilmadi'}, status=404)
        try:
            return TelegramUser.objects.get(pk=pk), None
        except TelegramUser.DoesNotExist:
            return None, Response({'error': 'Topilmadi'}, status=404)

    def _history(self, request, pk, tg_id=None):
        user, err = check_admin(request)
        if err:
            return err
        target, e = self._resolve_target(pk, tg_id)
        if e:
            return e
        messages = list(target.chat_messages.order_by('created_at'))
        # Admin ko'rdi — user'dan kelganlarni o'qildi deb belgilash
        target.chat_messages.filter(sender='user', is_read=False).update(is_read=True)
        return Response({
            'user': {
                'id': target.id,
                'telegram_id': target.telegram_id,
                'name': (target.first_name or '') + ((' ' + target.last_name) if target.last_name else ''),
                'username': target.username,
                'phone': target.phone,
            },
            'messages': [{
                'id': m.id,
                'sender': m.sender,
                'text': m.text,
                'created_at': m.created_at.isoformat(),
                'is_read': m.is_read,
            } for m in messages],
        })

    def get(self, request, pk):
        tg_id = request.query_params.get('tg')
        return self._history(request, pk, int(tg_id) if tg_id and tg_id.lstrip('-').isdigit() else None)

    def post(self, request, pk):
        tg_id = request.data.get('tg') or request.query_params.get('tg')
        try:
            tg_id = int(tg_id) if tg_id else None
        except (TypeError, ValueError):
            tg_id = None
        return self._history(request, pk, tg_id)


class AdminChatSendView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        # Avval pk bo'yicha, topilmasa tg bo'yicha
        tg_id = request.data.get('tg')
        try:
            tg_id = int(tg_id) if tg_id else None
        except (TypeError, ValueError):
            tg_id = None
        target = None
        if tg_id:
            try:
                target = TelegramUser.objects.get(telegram_id=tg_id)
            except TelegramUser.DoesNotExist:
                pass
        if target is None:
            try:
                target = TelegramUser.objects.get(pk=pk)
            except TelegramUser.DoesNotExist:
                return Response({'error': 'Topilmadi'}, status=404)
        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'error': 'Xabar bosh'}, status=400)
        if len(text) > 2000:
            return Response({'error': 'Xabar juda uzun'}, status=400)

        msg = ChatMessage.objects.create(user=target, sender='admin', text=text)

        # Userga Telegram orqali yuborish
        bot_token = settings.TELEGRAM_BOT_TOKEN
        if bot_token:
            try:
                requests.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        'chat_id': int(target.telegram_id),
                        'text': f"💬 Qo'llab-quvvatlash:\n\n{text}",
                    },
                    timeout=10,
                )
            except requests.RequestException as e:
                logger.error("Admin → user xabar yuborishda xato: %s", e)

        return Response({
            'ok': True,
            'message': {
                'id': msg.id,
                'sender': msg.sender,
                'text': msg.text,
                'created_at': msg.created_at.isoformat(),
                'is_read': False,
            },
        })


class AdminIssueTokenView(APIView):
    """Bot admin panel link yuborishi uchun token generatsiya qiladi.
    Bot o'z identifikatsiyasini TELEGRAM_BOT_TOKEN orqali tasdiqlaydi
    (bot va backend o'rtasida o'rtoq sir)."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Botni TELEGRAM_BOT_TOKEN orqali tasdiqlash (bot va backend o'rtasida o'rtoq sir)
        provided_secret = (
            (request.data.get('bot_secret') or '')
            or (request.headers.get('X-Bot-Secret') or '')
        ).strip()
        expected = (settings.TELEGRAM_BOT_TOKEN or '').strip()
        if not provided_secret or provided_secret != expected:
            return Response({'error': 'Forbidden'}, status=403)

        try:
            tg_id = int(request.data.get('tg_id') or 0)
        except (TypeError, ValueError):
            return Response({'error': "Noto'g'ri tg_id"}, status=400)

        if not tg_id or tg_id not in _valid_admin_ids():
            return Response({'error': "Sizda admin huquqlari yo'q"}, status=403)

        token = create_admin_token(tg_id)
        return Response({'token': token, 'expires_hours': 24})
