from django.db import models


class TelegramOutbox(models.Model):
    """Telegram-сообщения, которые не удалось доставить через relay.
    Досылаются RelayMonitor, как только relay снова доступен."""

    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "telegram_outbox"
        ordering = ["created_at"]
        verbose_name = "Недоставленное Telegram-сообщение"
        verbose_name_plural = "Недоставленные Telegram-сообщения"


class RelayHealth(models.Model):
    """Состояние связи с relay — всегда одна запись (pk=1).
    failing_since — начало текущей серии сбоев, alert_sent — письмо об аварии
    по этой серии уже отправлено (чтобы не слать его каждые 5 минут)."""

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
