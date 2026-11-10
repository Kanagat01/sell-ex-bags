import html
import logging
import re
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def html_to_plain(text: str) -> str:
    """Текст Telegram-сообщения (HTML-разметка) → обычный текст для письма"""
    return html.unescape(re.sub(r"<[^>]+>", "", text))


class TelegramService:

    @staticmethod
    def _relay_post(path: str, payload: dict | None = None) -> None:
        """Запрос к tg-relay. Бросает RequestException при сбое relay или Telegram."""
        response = requests.post(
            f"{settings.TELEGRAM_RELAY_URL.rstrip('/')}{path}",
            json=payload or {},
            headers={"X-Secret": settings.TELEGRAM_RELAY_SECRET},
            timeout=10,
        )
        response.raise_for_status()

    @staticmethod
    def deliver(text: str) -> None:
        TelegramService._relay_post("/notify", {"text": text})

    @staticmethod
    def ping() -> None:
        TelegramService._relay_post("/ping")

    @staticmethod
    def _send(text: str) -> None:
        """Шлёт уведомление; при сбое откладывает в outbox, во время аварии дублирует на почту."""
        from apps.notifications.models import RelayHealth, TelegramOutbox
        from apps.notifications.services.email import EmailService

        if not settings.TELEGRAM_RELAY_URL:
            logger.warning("TELEGRAM_RELAY_URL не задан — уведомление в Telegram пропущено")
            return

        try:
            TelegramService.deliver(text)
        except requests.RequestException:
            logger.exception("Не удалось доставить через relay (relay или Telegram) — сообщение отложено в outbox")
            TelegramOutbox.objects.create(text=text)
            if RelayHealth.get().alert_sent:
                EmailService.send_alert("Уведомление (Telegram недоступен)", html_to_plain(text))

    @staticmethod
    def send_daily_report() -> None:
        from apps.applications.models import Application
        from apps.contracts.models import Document

        since = timezone.now() - timedelta(days=1)
        new_count = Application.objects.filter(created_at__gte=since).count()
        signed_count = Document.objects.filter(signed_at__gte=since).count()
        text = (
            "<b>✅ Всё работает</b>\n\n"
            f"За сутки: новых заявок — {new_count}, подписанных документов — {signed_count}"
        )
        TelegramService._send(text)

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
    def send_delivery_method_chosen(delivery_request) -> None:
        application = delivery_request.application
        text = (
            f"<b>🚚 Выбран способ передачи — {html.escape(application.phone)}</b>\n\n"
            f"Способ: {html.escape(delivery_request.get_method_display())}\n"
            + (f"Адрес: {html.escape(delivery_request.address)}\n" if delivery_request.address else "")
            + f"\nПосмотреть: {settings.FRONTEND_URL}/admin/applications/{application.id}"
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
