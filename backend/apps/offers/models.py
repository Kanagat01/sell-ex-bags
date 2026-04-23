import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


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

    def __str__(self) -> str:
        return f"Offer for {self.application}"


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