from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Document


@receiver(post_delete, sender=Document)
def delete_document_file(sender, instance: Document, **kwargs) -> None:
    """Удаляет PDF-файл документа из хранилища при удалении записи (в т.ч.
    каскадом при удалении заявки)."""
    if instance.pdf_file:
        instance.pdf_file.delete(save=False)
