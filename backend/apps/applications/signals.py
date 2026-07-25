from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import ApplicationPhoto


@receiver(post_delete, sender=ApplicationPhoto)
def delete_photo_file(sender, instance: ApplicationPhoto, **kwargs) -> None:
    """Удаляет файл фото из хранилища при удалении записи (в т.ч. каскадом при
    удалении заявки)."""
    if instance.file:
        instance.file.delete(save=False)
