import uuid
from django.db import models


class Contract(models.Model):
    application = models.OneToOneField(
        "applications.Application",
        on_delete=models.CASCADE,
        related_name="contract",
    )
    sign_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    contract_number = models.CharField(max_length=20, blank=True)
    pdf_file = models.FileField(upload_to="contracts/%Y/%m/", blank=True)

    # Данные подписания
    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by_phone = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "contracts"
        verbose_name = "Договор"
        verbose_name_plural = "Договоры"

    def __str__(self) -> str:
        return f"Contract for {self.application}"


class SmsCode(models.Model):
    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name="sms_codes",
    )
    phone = models.CharField(max_length=20)
    code = models.CharField(max_length=6)
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "sms_codes"
        verbose_name = "SMS код"
        verbose_name_plural = "SMS коды"