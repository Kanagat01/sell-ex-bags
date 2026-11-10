from django.db import models


class TelegramOutbox(models.Model):
    """Недоставленные Telegram-сообщения; досылает RelayMonitor."""

    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "telegram_outbox"
        ordering = ["created_at"]
        verbose_name = "Недоставленное Telegram-сообщение"
        verbose_name_plural = "Недоставленные Telegram-сообщения"


class RelayHealth(models.Model):
    """Состояние связи с relay — одна запись (pk=1): начало текущего сбоя и отправлено ли письмо."""

    failing_since = models.DateTimeField(null=True, blank=True)
    alert_sent = models.BooleanField(default=False)

    class Meta:
        db_table = "relay_health"
        verbose_name = "Состояние relay"
        verbose_name_plural = "Состояние relay"

    @classmethod
    def get(cls) -> "RelayHealth":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
