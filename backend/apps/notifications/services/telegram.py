import html
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class TelegramService:

    @staticmethod
    def _send(text: str) -> None:
        bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", "")
        chat_id = getattr(settings, "TELEGRAM_CHAT_ID", "")

        if not bot_token or not chat_id:
            logger.warning(
                "Telegram не настроен: TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы")
            return

        proxy = getattr(settings, "TELEGRAM_PROXY", None)
        try:
            response = requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
                proxies={"https": proxy} if proxy else None,
                timeout=10,
            )
            response.raise_for_status()
        except requests.RequestException as e:
            logger.error(f"Telegram: сообщение не отправлено — {e}")

    @staticmethod
    def send_new_application(application) -> None:
        items = list(application.items.all())
        items_text = "\n".join(
            f"  • {html.escape(f'{item.brand} {item.model}'.strip())} — {item.desired_price} ₽"
            for item in items
        )
        text = (
            f"<b>📦 Новая заявка</b>\n\n"
            f"Формат: {html.escape(application.get_format_display())}\n"
            f"Телефон: {html.escape(application.phone)}\n"
            f"Email: {html.escape(application.email) if application.email else '—'}\n\n"
            f"Изделия:\n{items_text}\n\n"
            f"Посмотреть: {settings.FRONTEND_URL}/admin/applications/{application.id}"
        )
        TelegramService._send(text)

    @staticmethod
    def send_document_signed_notification(document) -> None:
        application = document.application
        items = list(application.items.all())
        total = sum(i.offered_price for i in items if i.offered_price)
        text = (
            f"<b>{html.escape(document.get_document_type_display())} подписан — {html.escape(application.phone)}</b>\n\n"
            f"Формат: {html.escape(application.get_format_display())}\n"
            f"Телефон: {html.escape(application.phone)}\n"
            f"Итого: {total} ₽\n\n"
            f"Посмотреть: {settings.FRONTEND_URL}/admin/applications/{application.id}"
        )
        TelegramService._send(text)
