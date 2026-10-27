from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("django-admin/", admin.site.urls),

    # JWT авторизация для администратора
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Публичные эндпоинты
    path("api/", include("apps.applications.urls")),
    path("api/", include("apps.offers.urls")),
    path("api/", include("apps.contracts.urls")),
    path("api/", include("apps.delivery.urls")),
]

# Медиафайлы в локальной среде
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)