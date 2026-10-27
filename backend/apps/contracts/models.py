import uuid
from django.db import models


def document_upload_path(instance: "Document", filename: str) -> str:
    return f"documents/{instance.document_type}/{filename}"


class DocumentType(models.TextChoices):
    CONTRACT = "contract", "Договор"
    ACCEPTANCE_ACT = "acceptance", "Акт приёма-передачи"
    RETURN_ACT = "return", "Акт возврата"
    AMENDMENT = "amendment", "Доп. соглашение"
    CLOSING_REPORT = "closing_report", "Отчёт о закрытии"


class Document(models.Model):
    application = models.ForeignKey(
        "applications.Application",
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
    )
    sign_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    document_number = models.CharField(max_length=20, blank=True)
    pdf_file = models.FileField(upload_to=document_upload_path, blank=True)

    # Когда клиенту отправлена ссылка на подпись. Для актов/доп. соглашения
    # это совпадает с моментом генерации (одно действие), а для закрывающего
    # отчёта (загрузка файла и отправка — два разных шага) это единственный
    # способ узнать, была ли уже отправлена ссылка.
    sent_at = models.DateTimeField(null=True, blank=True)

    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by_phone = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "documents"
        verbose_name = "Документ"
        verbose_name_plural = "Документы"
        unique_together = [("application", "document_type")]

    def __str__(self) -> str:
        return f"{self.get_document_type_display()} — {self.application}"


class AmendmentDetail(models.Model):
    """Старая/новая цена по одному изделию в доп. соглашении. Одно
    доп. соглашение (Document) может охватывать несколько изделий —
    по одной строке AmendmentDetail на каждое."""

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="amendment_details",
    )
    item = models.ForeignKey(
        "applications.ApplicationItem",
        on_delete=models.CASCADE,
        related_name="amendments",
    )
    old_price = models.DecimalField(max_digits=12, decimal_places=2)
    new_price = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "amendment_details"
        unique_together = [("document", "item")]
        verbose_name = "Доп. соглашение — изменение цены"
        verbose_name_plural = "Доп. соглашения — изменения цены"


class SmsCode(models.Model):
    document = models.ForeignKey(
        Document,
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