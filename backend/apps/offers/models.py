import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from apps.applications.models import ApplicationFormat


def token_expiry():
    return timezone.now() + timedelta(hours=settings.OFFER_TOKEN_TTL_HOURS)


class Offer(models.Model):
    application = models.OneToOneField(
        "applications.Application",
        on_delete=models.CASCADE,
        related_name="offer",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField(default=token_expiry)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "offers"
        verbose_name = "Предложение"
        verbose_name_plural = "Предложения"

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def get_options(self) -> list[tuple[str, list]]:
        """Варианты сотрудничества: [(format, [(item, price), ...]), ...]
        в порядке Выкуп → Trade-In → Реализация. Для старых офферов (без
        OfferPrice) — один вариант из формата заявки и offered_price."""
        prices = list(self.prices.select_related("item").order_by("item__order", "item_id"))
        if not prices:
            items = self.application.items.filter(offered_price__isnull=False)
            return [(self.application.format, [(item, item.offered_price) for item in items])]

        options = []
        for fmt in ApplicationFormat.values:
            option_items = [(p.item, p.price) for p in prices if p.format == fmt]
            if option_items:
                options.append((fmt, option_items))
        return options

    def __str__(self) -> str:
        return f"Offer for {self.application}"


class OfferPrice(models.Model):
    """Цена изделия в конкретном формате сотрудничества. Админ может отправить
    сразу несколько форматов — клиент выбирает один на всю заявку."""

    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name="prices")
    item = models.ForeignKey(
        "applications.ApplicationItem",
        on_delete=models.CASCADE,
        related_name="offer_prices",
    )
    format = models.CharField(max_length=20, choices=ApplicationFormat.choices)
    price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "offer_prices"
        unique_together = [("offer", "item", "format")]
        verbose_name = "Цена в предложении"
        verbose_name_plural = "Цены в предложении"


class PersonalData(models.Model):
    """Персональные данные продавца для договора — хранятся отдельно по 152-ФЗ"""

    application = models.OneToOneField(
        "applications.Application",
        on_delete=models.CASCADE,
        related_name="personal_data",
    )

    full_name = models.CharField(max_length=300)
    date_of_birth = models.DateField()
    passport_series = models.CharField(max_length=4)
    passport_number = models.CharField(max_length=6)
    passport_issued_by = models.CharField(max_length=500)
    passport_issued_date = models.DateField()
    registration_address = models.TextField()
    inn = models.CharField(max_length=12, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    bank_name = models.CharField(max_length=500, blank=True)
    bik = models.CharField(max_length=9, blank=True)
    correspondent_account = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "personal_data"
        verbose_name = "Персональные данные"
        verbose_name_plural = "Персональные данные"