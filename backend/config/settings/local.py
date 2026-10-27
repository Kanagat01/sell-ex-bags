from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

# Локальное хранилище файлов
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Локально не шлём реальные SMS/email — просто печатаем в консоль/лог
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
SMS_BACKEND = "console"