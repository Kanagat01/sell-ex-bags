# CLAUDE.md — правила работы по проекту sell-ex-bags

## Git / коммиты

- **НИКОГДА** не добавлять авторство Claude/AI нигде: ни в коммиты (`Co-Authored-By`,
  «Generated with Claude» и т.п.), ни в код, ни в PR, ни в любой текст.
- Ветка — **master** (trunk-based), коммитим прямо в неё.
- Перед началом любой работы: `git fetch origin master` и, если мастер ушёл вперёд, `git pull`.
- Сообщения коммитов — по-русски, коротко, в нижнем регистре (стиль существующих:
  `hotfix`, `logo changed, new urls`).
- `origin` = `github.com/Kanagat01/sell-ex-bags.git` (НЕ `ex-bags.git` — это другой проект).
- Референсы (`*.docx`, `*.pdf`, `comission.jpg`, `sell-dsgn.html`) в код не коммитить.

## Качество кода

- **Сначала искать, потом писать.** Перед новой функцией/компонентом/шаблоном — поиск
  (Grep/Glob) похожего в проекте. Есть подходящее — переиспользовать или расширить, а не
  писать рядом второе такое же.
- **DRY.** Одна и та же логика/разметка не должна жить в двух местах. Повтор появился
  второй раз — выносить в общее: функцию в `utils`, хук в `hooks`, компонент в
  `components/ui` или `components/shared`, метод сервиса, общий partial шаблона.
  Исключение — 2–3 похожие строки, где общая абстракция была бы натянутой.
- **Знать и использовать существующее:**
  - фронт: `components/ui` (Button, Input, Select, Textarea, PhoneInput, Modal, FileInput,
    FileUpload…), `utils` (formatters, constants, `getApiError`, `normalizePhone`),
    `api/*` (весь HTTP только через них), `types/*`;
  - бэк: `phone.normalize_phone`, сервисы (`ApplicationService`, `OfferService`,
    `DocumentService`, `SmsService`, `TelegramService`), задачи в `notifications/tasks.py`
    (паттерн оркестратор → канальные задачи с `CHANNEL_RETRY`);
  - шаблоны документов: `_base_styles.html`, общий контекст `DocumentService._build_context`.
- **Инкапсуляция / слои.** Бизнес-логика — в `services.py` (бэк), вьюхи тонкие: валидация
  через сериализатор → вызов сервиса → ответ. Сериализаторы не ходят в чужие модели и не
  шлют уведомления. На фронте страница не лезет в axios напрямую — только через `api/*`;
  стейт, нужный нескольким страницам, — в `store/`.
- **Наследование / композиция.** Общее поведение — через базовый класс/миксин (Django,
  DRF: базовые вьюхи и сериализаторы, `ModelSerializer`) или композицию компонентов, а не
  копипастой класса с правками. Варианты одного документа — один шаблон с параметрами
  (как `amendment.html` + `AMENDMENT_TERMS`), а не N почти одинаковых файлов.
- **Один источник правды.** Константы, choices, тексты статусов — в одном месте
  (`TextChoices` на бэке, `constants.ts` на фронте). Формулы, которые есть и на бэке, и на
  фронте (комиссия), держать синхронными и помечать комментарием, где пара.
- **Без мёртвого кода.** Неиспользуемое — удалять, а не оставлять «на всякий случай»;
  без заглушек-«совместимостей».
- **Проверка своей работы** перед сдачей: прочитать итоговый дифф целиком (нет ли дублей,
  забытых старых блоков), прогнать проверки (см. «Команды»), для UI — открыть в браузере.

## Архитектура

- **backend** — Django + DRF (apps: `applications`, `offers`, `contracts`, `delivery`, `notifications`),
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
  В Git Bash добавлять `MSYS_NO_PATHCONV=1`, иначе `-w /app` превращается в Windows-путь.
- Миграции **только** через `makemigrations` (руками не писать). Data-migration —
  `makemigrations <app> --empty`, затем дописать `RunPython` с обратной функцией.
- Рендер PDF (WeasyPrint) работает только в контейнере, не на Windows-хосте.
- У контейнера `frontend` нет volume с исходниками — `tsc`/`eslint` внутри него проверяют
  старый код образа. Проверять на хосте: `cd frontend && npx tsc --noEmit && npx eslint src`.

## Документы (договоры/акты)

- Договор и акты — **отдельные** PDF-файлы (не склеивать в один).
- Шаблоны: `backend/apps/contracts/templates/contracts/`; общий CSS — `_base_styles.html`
  (подключается через `{% include %}`), локальные переопределения — в каждом шаблоне.
- Ассеты (лого, шрифт Suisse Intl, печать, подпись) грузятся через `base_url` из
  `apps/contracts/assets/`.
- Шрифт документов — Times New Roman; в образе его заменяет метрически совместимый
  Liberation Serif (`fonts-liberation` в Dockerfile). Без него WeasyPrint молча берёт
  DejaVu Serif, и документ выглядит крупнее и иначе, чем docx.
- Шаблон делается по docx заказчика: размеры брать из XML docx (кегль `w:sz` — в
  полупунктах, поля/ширины — в twips: 1 twip = 1/1440 дюйма ≈ 0,0176 мм), а не на глаз.
