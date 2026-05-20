from django.db import models


class ApplicationFormat(models.TextChoices):
    PURCHASE = "purchase", "Выкуп"
    TRADE_IN = "trade_in", "Trade-In"
    COMMISSION = "commission", "Реализация"


class ApplicationStatus(models.TextChoices):
    NEW = "new", "Новая"
    OFFER_SENT = "offer_sent", "Предложение отправлено"
    ACCEPTED = "accepted", "Принято"
    DECLINED = "declined", "Отказано"
    CONTRACT_SIGNED = "contract_signed", "Договор подписан"
    ITEM_TRANSFERRED = "item_transferred", "Товар передан"
    RETURN_PROCESSED = "return_processed", "Оформлен возврат"


class ApplicationCondition(models.TextChoices):
    EXCELLENT = "excellent", "Отличное"
    GOOD = "good", "Хорошее"
    SATISFACTORY = "satisfactory", "Удовлетворительное"


class Application(models.Model):
    format = models.CharField(
        max_length=20,
        choices=ApplicationFormat.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.NEW,
    )
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    rejection_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "applications"
        ordering = ["-created_at"]
        verbose_name = "Заявка"
        verbose_name_plural = "Заявки"

    def __str__(self) -> str:
        return f"{self.get_format_display()} — {self.phone} ({self.get_status_display()})".strip()


class ApplicationItem(models.Model):
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="items",
    )
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=200, blank=True)
    size = models.CharField(max_length=50, blank=True)
    condition = models.CharField(
        max_length=20,
        choices=ApplicationCondition.choices,
    )
    defects_description = models.TextField(blank=True)
    desired_price = models.DecimalField(max_digits=12, decimal_places=2)
    offered_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "application_items"
        ordering = ["order"]
        verbose_name = "Изделие"
        verbose_name_plural = "Изделия"

    def __str__(self) -> str:
        return f"{self.brand} {self.model}".strip()


class ApplicationPhoto(models.Model):
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name="photos",
    )
    item = models.ForeignKey(
        ApplicationItem,
        on_delete=models.CASCADE,
        related_name="photos",
        null=True,
        blank=True,
    )
    file = models.ImageField(upload_to="applications/%Y/%m/")
    order = models.PositiveSmallIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "application_photos"
        ordering = ["order"]
        verbose_name = "Фото заявки"
        verbose_name_plural = "Фото заявок"
