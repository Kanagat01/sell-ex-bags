# CLAUDE.md — правила работы по проекту sell-ex-bags

## Git / коммиты

- **НИКОГДА** не добавлять авторство Claude/AI нигде: ни в коммиты (`Co-Authored-By`,
  «Generated with Claude» и т.п.), ни в код, ни в PR, ни в любой текст.
- Ветка — **master** (trunk-based), коммитим прямо в неё.
- Сообщения коммитов — по-русски, коротко, в нижнем регистре (стиль существующих:
  `hotfix`, `logo changed, new urls`).
- `origin` = `github.com/Kanagat01/sell-ex-bags.git` (НЕ `ex-bags.git` — это другой проект).
- Референсы (`*.docx`, `*.pdf`, `comission.jpg`, `sell-dsgn.html`) в код не коммитить.

## Архитектура

- **backend** — Django + DRF (apps: `applications`, `offers`, `contracts`, `notifications`),
  gunicorn, зависимости через `uv`.
- **frontend** — Next.js (App Router), Tailwind, обычные `<img>` (не next/image).
- **celery** + **redis** (брокер), **postgres**, **nginx** — всё в docker-compose.
- Два сервера: сервер сайта (РФ, Telegram заблокирован) и второй сервер с **tg-relay**
  (FastAPI, папка `tg-relay/`) — через него уходят Telegram-уведомления.

## Важные нюансы

- Telegram-уведомления идут **только через tg-relay** (`TELEGRAM_RELAY_URL` /
  `TELEGRAM_RELAY_SECRET`), не напрямую в api.telegram.org.
- Комиссия (реализация) считается на фронте: `getCommissionRate` в
  `frontend/src/utils/formatters.ts`. Таблица тарифов на главной — `app/page.tsx`.
- Медиафайлы (фото заявок, PDF) удаляются сигналами `post_delete` (`apps/*/signals.py`)
  при удалении записей — Django сам файлы не трёт.
- SMS — через `smsaero-api` (`SmsService`). Подписание документов — SMS-код (планируется
  переход на Mobile ID).
- Уведомления — celery-задачи с retry (fan-out по каналам); сервисы email/sms/telegram
  ошибки НЕ глотают (бросают → retry).

## Команды в контейнере

- Django management:
  `docker compose exec -w /app -e PYTHONPATH=/app celery uv run python manage.py <cmd>`
  (backend и celery собраны из образа `./backend`).
- Рендер PDF (WeasyPrint) работает только в контейнере, не на Windows-хосте.

## Документы (договоры/акты)

- Договор и акты — **отдельные** PDF-файлы (не склеивать в один).
- Шаблоны: `backend/apps/contracts/templates/contracts/`; общий CSS — `_base_styles.html`
  (подключается через `{% include %}`), локальные переопределения — в каждом шаблоне.
- Ассеты (лого, шрифт Suisse Intl, печать, подпись) грузятся через `base_url` из
  `apps/contracts/assets/`.
