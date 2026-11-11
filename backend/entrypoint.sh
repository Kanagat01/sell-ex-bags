#!/bin/sh
set -e  # Останавливаем скрипт при любой ошибке

echo "🚀 Starting Django application..."

# celery и celery-beat пропускают: миграции и статику делает только backend,
# иначе контейнеры одновременно применяют одни и те же миграции
if [ -z "$SKIP_DJANGO_SETUP" ]; then
    echo "Applying database migrations..."
    uv run python manage.py migrate --noinput

    echo "Collecting static files..."
    uv run python manage.py collectstatic --noinput --clear
fi

# Опционально: можно добавить создание суперюзера (только в dev)
# if [ "$DJANGO_SUPERUSER_CREATE" = "true" ]; then
#     uv run python manage.py createsuperuser --noinput || true
# fi

echo "✅ Django setup completed successfully!"

# Запускаем то, что передали в CMD (Gunicorn)
exec "$@"