"""Telegram relay — крутится на сервере, где Telegram доступен.
Принимает POST /notify {text} от сайта (сайт в РФ до api.telegram.org не достаёт)
и пересылает в чат через Bot API. Защита — общий секрет в заголовке X-Secret.

Заодно сторожит сайт: сайт каждые 5 минут шлёт POST /ping. Если пингов нет
дольше SITE_SILENCE_MINUTES — одно письмо на ALERT_EMAILS; когда пинги
возобновятся — письмо о восстановлении.
"""
import asyncio
import logging
import os
import smtplib
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from email.message import EmailMessage
from zoneinfo import ZoneInfo

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
RELAY_SECRET = os.environ["RELAY_SECRET"]

SITE_SILENCE = timedelta(minutes=float(os.environ.get("SITE_SILENCE_MINUTES", "60")))
WATCH_INTERVAL_SECONDS = float(os.environ.get("WATCH_INTERVAL_SECONDS", "60"))
ALERT_EMAILS = [e.strip() for e in os.environ.get("ALERT_EMAILS", "").split(",") if e.strip()]
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_SSL = os.environ.get("SMTP_SSL", "true").lower() == "true"  # false → STARTTLS
ALERT_FROM = os.environ.get("ALERT_FROM", SMTP_USER)

TG_API = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
MSK = ZoneInfo("Europe/Moscow")

logger = logging.getLogger("tg-relay")

# Состояние в памяти: relay работает в одном процессе uvicorn. После
# перезапуска отсчёт тишины начинается заново (ложной тревоги не будет).
state = {"last_ping": datetime.now(MSK), "alert_sent": False}


def fmt_time(dt: datetime) -> str:
    return dt.astimezone(MSK).strftime("%d.%m.%Y %H:%M")


def fmt_duration(delta: timedelta) -> str:
    minutes = int(delta.total_seconds() // 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours} ч {minutes} мин" if hours else f"{minutes} мин"


def send_email(subject: str, body: str) -> None:
    """Бросает исключение при сбое — вызывающий решает, повторять ли."""
    if not (ALERT_EMAILS and SMTP_HOST):
        logger.warning("ALERT_EMAILS/SMTP_HOST не заданы — письмо «%s» не отправлено", subject)
        return
    msg = EmailMessage()
    msg["Subject"] = f"[sell.ex-bags relay] {subject}"
    msg["From"] = ALERT_FROM
    msg["To"] = ", ".join(ALERT_EMAILS)
    msg.set_content(body)
    if SMTP_SSL:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)


async def check_site_silence() -> None:
    """Одно письмо на одну аварию: флаг ставится только после успешной отправки,
    иначе попробуем на следующей проверке."""
    silence = datetime.now(MSK) - state["last_ping"]
    if state["alert_sent"] or silence < SITE_SILENCE:
        return
    try:
        await asyncio.to_thread(
            send_email,
            "Сайт не выходит на связь",
            f"Сайт sell.ex-bags не выходил на связь с relay с {fmt_time(state['last_ping'])} "
            f"(уже {fmt_duration(silence)}).\n"
            "Скорее всего, упал сервер сайта, celery или celery-beat — новые заявки "
            "могут не обрабатываться.",
        )
    except Exception:
        logger.exception("Не удалось отправить письмо об аварии сайта")
        return
    state["alert_sent"] = True


async def watch_site() -> None:
    while True:
        await asyncio.sleep(WATCH_INTERVAL_SECONDS)
        await check_site_silence()


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(watch_site())
    yield
    task.cancel()


app = FastAPI(title="tg-relay", lifespan=lifespan)


def check_secret(x_secret: str) -> None:
    if x_secret != RELAY_SECRET:
        raise HTTPException(status_code=401, detail="unauthorized")


class Notify(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ping")
async def ping(x_secret: str = Header(default="")):
    check_secret(x_secret)
    now = datetime.now(MSK)
    if state["alert_sent"]:
        try:
            await asyncio.to_thread(
                send_email,
                "Сайт снова на связи",
                f"Сайт sell.ex-bags снова выходит на связь. "
                f"Простой: {fmt_duration(now - state['last_ping'])} (с {fmt_time(state['last_ping'])}).",
            )
        except Exception:
            logger.exception("Не удалось отправить письмо о восстановлении сайта")
        state["alert_sent"] = False
    state["last_ping"] = now
    return {"ok": True}


@app.post("/notify")
async def notify(payload: Notify, x_secret: str = Header(default="")):
    check_secret(x_secret)

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            TG_API,
            json={
                "chat_id": CHAT_ID,
                "text": payload.text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
        )
    if r.status_code != 200:
        # 502 → сайт отложит сообщение в outbox и дошлёт позже
        raise HTTPException(status_code=502, detail=f"telegram error: {r.text}")
    return {"ok": True}
