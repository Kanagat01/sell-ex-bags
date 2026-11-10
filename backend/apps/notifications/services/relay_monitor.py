import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone

from apps.notifications.models import RelayHealth, TelegramOutbox
from apps.notifications.services.email import EmailService
from apps.notifications.services.telegram import TelegramService, html_to_plain

logger = logging.getLogger(__name__)


def _fmt_duration(delta: timedelta) -> str:
    minutes = int(delta.total_seconds() // 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours} ч {minutes} мин" if hours else f"{minutes} мин"


def _fmt_time(dt) -> str:
    return timezone.localtime(dt).strftime("%d.%m.%Y %H:%M")


class RelayMonitor:
    """Следит за связью сайт → relay → Telegram (celery beat, раз в 5 минут):
    досылает отложенные сообщения, при долгом сбое пишет на почту."""

    @staticmethod
    def check() -> None:
        if not settings.TELEGRAM_RELAY_URL:
            return

        health = RelayHealth.get()
        try:
            TelegramService.ping()
            delivered = RelayMonitor._flush_outbox()
        except requests.RequestException as e:
            RelayMonitor._on_failure(health, e)
            return
        RelayMonitor._on_success(health, delivered)

    @staticmethod
    def _flush_outbox() -> int:
        """Досылает отложенные сообщения по порядку, до первого сбоя."""
        delivered = 0
        for message in TelegramOutbox.objects.order_by("created_at"):
            TelegramService.deliver(message.text)
            message.delete()
            delivered += 1
        return delivered

    @staticmethod
    def _on_failure(health: RelayHealth, error: Exception) -> None:
        now = timezone.now()
        if health.failing_since is None:
            health.failing_since = now
            health.save(update_fields=["failing_since"])
        logger.warning("Relay недоступен с %s: %s", _fmt_time(health.failing_since), error)

        alert_after = timedelta(minutes=settings.RELAY_ALERT_AFTER_MINUTES)
        if health.alert_sent or now - health.failing_since < alert_after:
            return

        pending = list(TelegramOutbox.objects.order_by("created_at"))
        body = (
            f"Сайт не может отправить уведомления в Telegram с {_fmt_time(health.failing_since)} "
            f"(уже {_fmt_duration(now - health.failing_since)}).\n"
            f"Ошибка: {error}\n\n"
            "Пока связь не восстановится, новые уведомления будут приходить на эту почту, "
            "а после восстановления все они будут досланы в Telegram."
        )
        if pending:
            body += f"\n\nНе доставлено в Telegram ({len(pending)}):\n\n" + "\n\n— — —\n\n".join(
                f"[{_fmt_time(m.created_at)}]\n{html_to_plain(m.text)}" for m in pending
            )
        # Письмо сначала, флаг потом: если почта не ушла — попробуем на следующем запуске
        EmailService.send_alert("Telegram-уведомления не работают", body)
        health.alert_sent = True
        health.save(update_fields=["alert_sent"])

    @staticmethod
    def _on_success(health: RelayHealth, delivered: int) -> None:
        if health.failing_since is None:
            return
        if health.alert_sent:
            downtime = timezone.now() - health.failing_since
            EmailService.send_alert(
                "Telegram-уведомления снова работают",
                f"Связь с Telegram восстановлена. Простой: {_fmt_duration(downtime)} "
                f"(с {_fmt_time(health.failing_since)}).\n"
                f"Досланных в Telegram сообщений: {delivered}.",
            )
        health.failing_since = None
        health.alert_sent = False
        health.save(update_fields=["failing_since", "alert_sent"])
