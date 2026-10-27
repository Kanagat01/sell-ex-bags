import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class DeliveryMethod(models.TextChoices):
    BOUTIQUE = "boutique", "В бутике (ex)bags"
    COURIER_MKAD = "courier_mkad", "Бесплатно курьером в пределах МКАД"
    COURIER_REGION = "courier_region", "Курьером в пределах Московской области"
    CDEK = "cdek", "Курьерской службой СДЭК"


def token_expiry():
    return timezone.now() + timedelta(hours=settings.DELIVERY_TOKEN_TTL_HOURS)


class DeliveryRequest(models.Model):
    """Запрос способа передачи сумки клиентом после подписания договора"""

    application = models.OneToOneField(
        "applications.Application",
        on_delete=models.CASCADE,
        related_name="delivery_request",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField(default=token_expiry)

    method = models.CharField(max_length=20, choices=DeliveryMethod.choices, blank=True)
    address = models.TextField(blank=True)  # только для courier_mkad / courier_region

    is_confirmed = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "delivery_requests"
        verbose_name = "Запрос способа передачи"
        verbose_name_plural = "Запросы способа передачи"

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def __str__(self) -> str:
        return f"Delivery request for {self.application}"
