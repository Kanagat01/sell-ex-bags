import logging
from celery import shared_task
from django.conf import settings


logger = logging.getLogger(__name__)


def _short_label(application) -> str:
    """Первый бренд + '+N изд.' если изделий больше одного."""
    items = list(application.items.all())
    if not items:
        return ""
    label = f"{items[0].brand} {items[0].model}".strip()
    if len(items) > 1:
        label += f" +{len(items) - 1} изд."
    return label


def _items_text(application, with_price: bool = False) -> str:
    """Список изделий — одна строка на каждое."""
    lines = []
    for item in application.items.all():
        name = f"{item.brand} {item.model}".strip()
        if with_price and item.offered_price:
            lines.append(f"• {name} — {item.offered_price} ₽")
        else:
            lines.append(f"• {name}")
    return "\n".join(lines)


@shared_task
def send_offer_notification(application_id: str) -> None:
    logger.info(
        "send_offer_notification called with application_id=%s", application_id)

    from apps.applications.models import Application
    from apps.notifications.services.sms import SmsService
    from apps.notifications.services.email import EmailService

    application = Application.objects.prefetch_related(
        "items"
    ).select_related("offer").get(id=application_id)
    offer_url = f"{settings.FRONTEND_URL}/offer/{application.offer.token}"

    short_label = _short_label(application)
    items_text = _items_text(application, with_price=True)
    total_amount = sum(
        i.offered_price for i in application.items.all() if i.offered_price)

    EmailService.send_offer_notification(
        email=application.email,
        short_label=short_label,
        items_text=items_text,
        amount=total_amount,
        offer_url=offer_url,
    )
    SmsService.send_offer_notification(
        phone=application.phone,
        short_label=short_label,
        amount=total_amount,
        offer_url=offer_url,
    )


@shared_task
def send_rejection_notification(application_id: str) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.sms import SmsService
    from apps.notifications.services.email import EmailService

    application = Application.objects.prefetch_related(
        "items").get(id=application_id)

    short_label = _short_label(application)
    items_text = _items_text(application)

    EmailService.send_rejection_notification(
        email=application.email,
        short_label=short_label,
        items_text=items_text,
        reason=application.rejection_reason,
    )
    SmsService.send_rejection_notification(
        phone=application.phone,
        short_label=short_label,
        reason=application.rejection_reason,
    )


@shared_task
def send_document_signed_notification(document_id: int) -> None:
    from apps.contracts.models import Document
    from apps.notifications.services.email import EmailService
    from apps.notifications.services.telegram import TelegramService

    document = Document.objects.select_related(
        "application").get(id=document_id)
    application = document.application

    if application.email and document.pdf_file:
        EmailService.send_document_copy(
            email=application.email,
            pdf_path=document.pdf_file.path,
            document_type_display=document.get_document_type_display(),
        )

    TelegramService.send_document_signed_notification(document)


@shared_task
def send_new_application_notification(application_id: int) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.telegram import TelegramService

    application = Application.objects.prefetch_related(
        "items").get(id=application_id)
    TelegramService.send_new_application(application)
