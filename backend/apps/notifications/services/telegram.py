import html
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class TelegramService:

    @staticmethod
    def _send(text: str) -> None:
        """Шлёт уведомление через tg-relay (на сервере, где Telegram доступен).
        Бросает исключение при сбое — celery-задача повторит по retry.
        Тихо пропускает, только если релей не настроен."""
        relay_url = getattr(settings, "TELEGRAM_RELAY_URL", "")
        relay_secret = getattr(settings, "TELEGRAM_RELAY_SECRET", "")

        if not relay_url:
            logger.warning("TELEGRAM_RELAY_URL не задан — уведомление в Telegram пропущено")
            return

        response = requests.post(
            f"{relay_url.rstrip('/')}/notify",
            json={"text": text},
            headers={"X-Secret": relay_secret},
            timeout=10,
        )
        response.raise_for_status()

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
