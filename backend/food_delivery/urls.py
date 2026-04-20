from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as static_serve

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'

def _serve_frontend(request, path=''):
    return static_serve(request, path or 'index.html', document_root=FRONTEND_DIR)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('products.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('users.urls')),
    # Serve index.html at root so Telegram WebApp URL hash (#tgWebAppData=...)
    # is preserved — a redirect would drop the hash on some Telegram clients.
    path('', _serve_frontend),
    re_path(r'^app/(?P<path>.*)$', _serve_frontend),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
