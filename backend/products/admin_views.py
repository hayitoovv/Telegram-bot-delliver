"""Admin paneli uchun Product/Category CRUD."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Category, Product
from food_delivery.admin_auth import check_admin


class _BaseAdminView(APIView):
    authentication_classes = []
    permission_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]


def _abs_url(request, file_field):
    if not file_field:
        return None
    url = file_field.url
    return request.build_absolute_uri(url) if request else url


def category_to_dict(cat, request=None):
    return {
        'id': cat.id,
        'name': cat.name,
        'name_ru': cat.name_ru,
        'image': _abs_url(request, cat.image),
        'is_active': cat.is_active,
        'order': cat.order,
    }


def product_to_dict(p, request=None):
    return {
        'id': p.id,
        'category': p.category_id,
        'category_name': p.category.name if p.category_id else None,
        'name': p.name,
        'name_ru': p.name_ru,
        'description': p.description,
        'description_ru': p.description_ru,
        'price': p.price,
        'image': _abs_url(request, p.image),
        'is_active': p.is_active,
        'created_at': p.created_at.isoformat(),
    }


class AdminCategoryListView(_BaseAdminView):
    def get(self, request):
        user, err = check_admin(request)
        if err:
            return err
        qs = Category.objects.all().order_by('order', 'name')
        data = []
        for cat in qs:
            d = category_to_dict(cat, request)
            d['products_count'] = cat.products.count()
            data.append(d)
        return Response({'results': data})

    def post(self, request):
        user, err = check_admin(request)
        if err:
            return err
        cat = Category.objects.create(
            name=request.data.get('name', '').strip()[:200],
            name_ru=request.data.get('name_ru', '').strip()[:200],
            is_active=str(request.data.get('is_active', 'true')).lower() in ('true', '1', 'on'),
            order=int(request.data.get('order') or 0),
        )
        image = request.FILES.get('image')
        if image:
            cat.image = image
            cat.save(update_fields=['image'])
        return Response(category_to_dict(cat, request), status=status.HTTP_201_CREATED)


class AdminCategoryDetailView(_BaseAdminView):
    def _get(self, pk):
        try:
            return Category.objects.get(pk=pk), None
        except Category.DoesNotExist:
            return None, Response({'error': 'Topilmadi'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        cat, e = self._get(pk)
        if e:
            return e

        for field in ('name', 'name_ru'):
            if field in request.data:
                setattr(cat, field, (request.data.get(field) or '').strip()[:200])
        if 'is_active' in request.data:
            cat.is_active = str(request.data.get('is_active')).lower() in ('true', '1', 'on')
        if 'order' in request.data:
            try:
                cat.order = int(request.data.get('order') or 0)
            except ValueError:
                pass
        image = request.FILES.get('image')
        if image:
            cat.image = image
        cat.save()
        return Response(category_to_dict(cat, request))

    def delete(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        cat, e = self._get(pk)
        if e:
            return e
        cat.delete()
        return Response({'ok': True})


class AdminProductListView(_BaseAdminView):
    def get(self, request):
        user, err = check_admin(request)
        if err:
            return err
        qs = Product.objects.select_related('category').all()
        category_id = request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(name__icontains=q)
        active = request.query_params.get('is_active')
        if active in ('true', 'false'):
            qs = qs.filter(is_active=(active == 'true'))

        ordering = request.query_params.get('ordering') or '-created_at'
        allowed_order = {'name', '-name', 'price', '-price', 'created_at', '-created_at'}
        if ordering in allowed_order:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-created_at')

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
        return Response({
            'results': [product_to_dict(p, request) for p in qs],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        })

    def post(self, request):
        user, err = check_admin(request)
        if err:
            return err
        try:
            category = Category.objects.get(pk=request.data.get('category'))
        except (Category.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Kategoriya tanlanmagan'}, status=400)

        product = Product.objects.create(
            category=category,
            name=(request.data.get('name') or '').strip()[:200],
            name_ru=(request.data.get('name_ru') or '').strip()[:200],
            description=(request.data.get('description') or '').strip(),
            description_ru=(request.data.get('description_ru') or '').strip(),
            price=int(request.data.get('price') or 0),
            is_active=str(request.data.get('is_active', 'true')).lower() in ('true', '1', 'on'),
        )
        image = request.FILES.get('image')
        if image:
            product.image = image
            product.save(update_fields=['image'])
        return Response(product_to_dict(product, request), status=status.HTTP_201_CREATED)


class AdminProductDetailView(_BaseAdminView):
    def _get(self, pk):
        try:
            return Product.objects.get(pk=pk), None
        except Product.DoesNotExist:
            return None, Response({'error': 'Topilmadi'}, status=404)

    def patch(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        product, e = self._get(pk)
        if e:
            return e

        if 'category' in request.data:
            try:
                product.category = Category.objects.get(pk=request.data.get('category'))
            except (Category.DoesNotExist, ValueError, TypeError):
                pass
        for field in ('name', 'name_ru', 'description', 'description_ru'):
            if field in request.data:
                val = (request.data.get(field) or '').strip()
                setattr(product, field, val[:200] if field in ('name', 'name_ru') else val)
        if 'price' in request.data:
            try:
                product.price = int(request.data.get('price') or 0)
            except ValueError:
                pass
        if 'is_active' in request.data:
            product.is_active = str(request.data.get('is_active')).lower() in ('true', '1', 'on')
        image = request.FILES.get('image')
        if image:
            product.image = image
        product.save()
        return Response(product_to_dict(product, request))

    def delete(self, request, pk):
        user, err = check_admin(request)
        if err:
            return err
        product, e = self._get(pk)
        if e:
            return e
        product.delete()
        return Response({'ok': True})


class AdminProductBulkView(_BaseAdminView):
    def post(self, request):
        user, err = check_admin(request)
        if err:
            return err
        ids = request.data.get('ids') or []
        action = request.data.get('action')
        if not ids or action not in ('activate', 'deactivate', 'delete'):
            return Response({'error': "Noto'g'ri so'rov"}, status=400)
        qs = Product.objects.filter(id__in=ids)
        count = qs.count()
        if action == 'activate':
            qs.update(is_active=True)
        elif action == 'deactivate':
            qs.update(is_active=False)
        elif action == 'delete':
            qs.delete()
        return Response({'ok': True, 'count': count})


class AdminCategoryBulkView(_BaseAdminView):
    def post(self, request):
        user, err = check_admin(request)
        if err:
            return err
        ids = request.data.get('ids') or []
        action = request.data.get('action')
        if not ids or action not in ('activate', 'deactivate', 'delete'):
            return Response({'error': "Noto'g'ri so'rov"}, status=400)
        qs = Category.objects.filter(id__in=ids)
        count = qs.count()
        if action == 'activate':
            qs.update(is_active=True)
        elif action == 'deactivate':
            qs.update(is_active=False)
        elif action == 'delete':
            qs.delete()
        return Response({'ok': True, 'count': count})
