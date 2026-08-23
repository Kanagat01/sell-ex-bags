# tg-relay

Крошечный сервис-релей для Telegram-уведомлений. Ставится на сервер, где
**Telegram доступен** (не РФ). Сайт (backend/celery) не достаёт `api.telegram.org`
напрямую, поэтому шлёт `POST /notify` сюда, а релей пересылает в чат.

## Как обрабатываются запросы
```
Сайт → HTTPS(443) → Caddy(этот сервер) → HTTP 127.0.0.1:8080 → uvicorn(релей) → api.telegram.org
```
- `tg-relay` (uvicorn) слушает обычный HTTP на 8080 — **наружу не публикуется**.
- `caddy` терминирует TLS на 443 и проксирует на релей. Сертификат Let's Encrypt
  Caddy получает и продлевает **сам**.

## Эндпоинты
- `GET /health` → `{"ok": true}`
- `POST /notify` (заголовок `X-Secret: <RELAY_SECRET>`), тело `{"text": "..."}` →
  `sendMessage` в `TELEGRAM_CHAT_ID`. 401 — неверный секрет, 502 — ошибка Telegram
  (сайт повторит по celery-retry).

## Деплой (на втором сервере)
Предварительно: **A-запись `RELAY_DOMAIN` → IP сервера**, открыты порты **80 и 443**.
```bash
cp .env.example .env     # заполнить RELAY_DOMAIN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, RELAY_SECRET
docker compose up -d --build
docker compose logs -f caddy      # дождаться выпуска сертификата (certificate obtained)
```
Проверка:
```bash
curl https://<RELAY_DOMAIN>/health                       # {"ok":true}
curl -X POST https://<RELAY_DOMAIN>/notify \
  -H "X-Secret: <RELAY_SECRET>" -H "Content-Type: application/json" \
  -d '{"text":"тест релея"}'                             # придёт в чат
```

## На стороне сайта
В `backend/.env`:
```
TELEGRAM_RELAY_URL=https://<RELAY_DOMAIN>
TELEGRAM_RELAY_SECRET=<тот же RELAY_SECRET>
```

## Если на сервере релея уже есть nginx (вместо Caddy)
Убери сервис `caddy` из compose, верни релею `ports: ["127.0.0.1:8080:8080"]`, и
добавь в свой nginx server-блок для `RELAY_DOMAIN` с сертификатом (certbot) и
`proxy_pass http://127.0.0.1:8080;`.
