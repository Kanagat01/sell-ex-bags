"""Telegram relay — крутится на сервере, где Telegram доступен.
Принимает POST /notify {text} от сайта (сайт в РФ до api.telegram.org не достаёт)
и пересылает в чат через Bot API. Защита — общий секрет в заголовке X-Secret.
"""
import os

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
RELAY_SECRET = os.environ["RELAY_SECRET"]

TG_API = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

app = FastAPI(title="tg-relay")


class Notify(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/notify")
async def notify(payload: Notify, x_secret: str = Header(default="")):
    if x_secret != RELAY_SECRET:
        raise HTTPException(status_code=401, detail="unauthorized")

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
        # 502 → сайт (celery) повторит по retry
        raise HTTPException(status_code=502, detail=f"telegram error: {r.text}")
    return {"ok": True}
