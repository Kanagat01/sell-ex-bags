import logging
from celery import shared_task
from django.conf import settings


logger = logging.getLogger(__name__)

# Общие параметры retry для канальных задач:
# - autoretry_for — повторять при любом исключении;
# - retry_backoff — экспоненциальная задержка (2, 4, 8… сек), c джиттером;
# - retry_backoff_max — потолок задержки 10 мин;
# - max_retries — до 5 повторов;
# - acks_late — если воркер упал в процессе, сообщение переотправится.
CHANNEL_RETRY = dict(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=5,
    acks_late=True,
)


def _short_label(application, rejected: bool = False) -> str:
    items = list(application.items.filter(offered_price__isnull=rejected))
    if not items:
        return ""
    label = f"{items[0].brand} {items[0].model}".strip()
    if len(items) > 1:
        label += f" +{len(items) - 1} изд."
    return label


def _items_text(application, with_price: bool = False, rejected: bool = False) -> str:
    lines = []
    for item in application.items.filter(offered_price__isnull=rejected):
        name = f"{item.brand} {item.model}".strip()
        if with_price and item.offered_price:
            lines.append(f"• {name} — {item.offered_price} ₽")
        else:
            lines.append(f"• {name}")
    return "\n".join(lines)


# ==================== Оркестраторы (fan-out по каналам) ====================
# Раскидывают уведомление по отдельным канальным задачам, чтобы повтор одного
# канала не дублировал уже отправленные другие каналы.

@shared_task
def send_offer_notification(application_id: str) -> None:
    logger.info("send_offer_notification: application_id=%s", application_id)
    send_offer_email.delay(application_id)
    send_offer_sms.delay(application_id)


@shared_task
def send_rejection_notification(application_id: str) -> None:
    send_rejection_email.delay(application_id)
    send_rejection_sms.delay(application_id)


@shared_task
def send_document_signed_notification(document_id: int) -> None:
    send_document_email.delay(document_id)
    send_document_telegram.delay(document_id)


# ==================== Канальные задачи (с retry) ====================

@shared_task(**CHANNEL_RETRY)
def send_offer_email(self, application_id: str) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.email import EmailService

    application = Application.objects.prefetch_related("items").select_related("offer").get(id=application_id)
    offer_url = f"{settings.FRONTEND_URL}/offer/{application.offer.token}"
    total_amount = sum(i.offered_price for i in application.items.all() if i.offered_price)

    EmailService.send_offer_notification(
        email=application.email,
        short_label=_short_label(application),
        items_text=_items_text(application, with_price=True),
        amount=total_amount,
        offer_url=offer_url,
    )


@shared_task(**CHANNEL_RETRY)
def send_offer_sms(self, application_id: str) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.sms import SmsService

    application = Application.objects.prefetch_related("items").select_related("offer").get(id=application_id)
    offer_url = f"{settings.FRONTEND_URL}/offer/{application.offer.token}"
    total_amount = sum(i.offered_price for i in application.items.all() if i.offered_price)

    SmsService.send_offer_notification(
        phone=application.phone,
        short_label=_short_label(application),
        amount=total_amount,
        offer_url=offer_url,
    )


@shared_task(**CHANNEL_RETRY)
def send_rejection_email(self, application_id: str) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.email import EmailService

    application = Application.objects.prefetch_related("items").get(id=application_id)
    EmailService.send_rejection_notification(
        email=application.email,
        short_label=_short_label(application, rejected=True),
        items_text=_items_text(application, rejected=True),
        reason=application.rejection_reason,
    )


@shared_task(**CHANNEL_RETRY)
def send_rejection_sms(self, application_id: str) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.sms import SmsService

    application = Application.objects.prefetch_related("items").get(id=application_id)
    SmsService.send_rejection_notification(
        phone=application.phone,
        short_label=_short_label(application, rejected=True),
        reason=application.rejection_reason,
    )


@shared_task(**CHANNEL_RETRY)
def send_document_email(self, document_id: int) -> None:
    from apps.contracts.models import Document
    from apps.notifications.services.email import EmailService

    document = Document.objects.select_related("application").get(id=document_id)
    application = document.application
    if application.email and document.pdf_file:
        EmailService.send_document_copy(
            email=application.email,
            pdf_path=document.pdf_file.path,
            document_type_display=document.get_document_type_display(),
        )


@shared_task(**CHANNEL_RETRY)
def send_document_telegram(self, document_id: int) -> None:
    from apps.contracts.models import Document
    from apps.notifications.services.telegram import TelegramService

    document = Document.objects.select_related("application").get(id=document_id)
    TelegramService.send_document_signed_notification(document)


@shared_task(**CHANNEL_RETRY)
def send_new_application_notification(self, application_id: int) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.telegram import TelegramService

    application = Application.objects.prefetch_related("items").get(id=application_id)
    TelegramService.send_new_application(application)
