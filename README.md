# Ex-Bags — платформа приёма люксовых сумок

Веб-сервис для приёма заявок от владельцев дизайнерских сумок.
Форматы: Выкуп, Trade-In, Реализация.

## Стек

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Zustand, React Hook Form, Zod
- **Backend**: Django 5, Django REST Framework, Celery, WeasyPrint
- **БД**: PostgreSQL (локально — SQLite)
- **Очереди**: Redis + Celery
- **SMS**: SMS Аэро

## Быстрый старт

### Требования

- Python 3.12+
- Node.js 20+
- uv (`pip install uv`)
- yarn (`npm install -g yarn`)
- Docker (опционально)

### 1. Клонировать репозиторий

```bash
git clone https://github.com/your-username/ex-bags.git
cd ex-bags
```

### 2. Настройка бэкенда

```bash
cd backend
cp .env.example .env
```

Заполни `.env` — минимум для локального запуска:

```
SECRET_KEY=любая-случайная-строка
DJANGO_SETTINGS_MODULE=config.settings.local
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://localhost:3000
```

Установи зависимости и запусти:

```bash
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver
```

Бэкенд доступен на http://localhost:8000

### 3. Настройка фронтенда

```bash
cd frontend
cp .env.example .env
```

`.env` уже содержит нужное значение:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Установи зависимости и запусти:

```bash
yarn install
yarn dev
```

Фронтенд доступен на http://localhost:3000

---

## Запуск через Docker

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# заполни .env файлы

docker compose up -d
docker compose exec backend uv run python manage.py createsuperuser
```

---

## Настройка SMS Аэро

1. Зарегистрируйся на [smsaero.ru](https://smsaero.ru)
2. В личном кабинете получи API-ключ
3. Создай подпись (Sign) — название компании
4. Заполни в `.env`:

```
SMS_AERO_EMAIL=твой@email.ru
SMS_AERO_API_KEY=твой-api-ключ
SMS_AERO_SIGN=НазваниеКомпании
```

---

## Настройка Email

Для Gmail создай пароль приложения:

1. Включи двухфакторную аутентификацию
2. Перейди в Аккаунт Google → Безопасность → Пароли приложений
3. Создай пароль и вставь в `.env`:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=твой@gmail.com
EMAIL_HOST_PASSWORD=пароль-приложения
DEFAULT_FROM_EMAIL=noreply@ex-bags.ru
```

---

## Настройка Celery (уведомления)

Celery запускается автоматически через Docker Compose вместе с остальными сервисами:

```bash
docker compose up -d
```

Отдельно запускать ничего не нужно. Проверить что воркер работает:

```bash
docker compose logs celery
```

---

## Структура проекта

```
ex-bags/
├── backend/                  # Django бэкенд
│   ├── apps/
│   │   ├── applications/     # Заявки
│   │   ├── offers/           # Предложения и персональные данные
│   │   ├── contracts/        # Договоры и SMS-подписание
│   │   └── notifications/    # SMS и Email уведомления
│   ├── config/               # Настройки Django
│   └── manage.py
│
└── frontend/                 # Next.js фронтенд
    └── src/
        ├── app/              # Страницы (App Router)
        ├── components/       # UI компоненты
        ├── api/              # Запросы к бэкенду
        ├── hooks/            # Кастомные хуки
        ├── store/            # Zustand стор
        ├── types/            # TypeScript типы
        └── utils/            # Утилиты и константы
```

---

## API эндпоинты

| Метод | URL                                   | Описание                   |
| ----- | ------------------------------------- | -------------------------- |
| POST  | /api/auth/login/                      | Вход администратора        |
| POST  | /api/auth/refresh/                    | Обновление токена          |
| POST  | /api/applications/                    | Создать заявку (публичный) |
| GET   | /api/admin/applications/              | Список заявок              |
| GET   | /api/admin/applications/:id/          | Детали заявки              |
| POST  | /api/admin/applications/:id/approve/  | Одобрить заявку            |
| POST  | /api/admin/applications/:id/reject/   | Отклонить заявку           |
| GET   | /api/admin/applications/:id/download/ | Скачать договор            |
| GET   | /api/offer/:token/                    | Предложение для продавца   |
| POST  | /api/offer/:token/accept/             | Принять предложение        |
| POST  | /api/offer/:token/decline/            | Отклонить предложение      |
| POST  | /api/offer/:token/personal-data/      | Персональные данные        |
| GET   | /api/sign/:token/contract/            | Получить договор PDF       |
| POST  | /api/sign/:token/request-code/        | Запросить SMS-код          |
| POST  | /api/sign/:token/confirm/             | Подтвердить подпись        |
