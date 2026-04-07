import logging
from celery import shared_task
from django.conf import settings


logger = logging.getLogger(__name__)


@shared_task
def send_offer_notification(application_id: str) -> None:
    logger.info(
        "send_offer_notification called with application_id=%s", application_id)

    from apps.applications.models import Application
    from apps.notifications.services.sms import SmsService
    from apps.notifications.services.email import EmailService

    application = Application.objects.select_related(
        "offer").get(id=application_id)
    offer_url = f"{settings.FRONTEND_URL}/offer/{application.offer.token}"

    EmailService.send_offer_notification(
        email=application.email,
        brand=f"{application.brand} {application.model}",
        model=application.model,
        amount=application.offered_price,
        offer_url=offer_url,
    )
    SmsService.send_offer_notification(
        phone=application.phone,
        brand=f"{application.brand} {application.model}",
        amount=application.offered_price,
        offer_url=offer_url,
    )


@shared_task
def send_rejection_notification(application_id: str) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.sms import SmsService
    from apps.notifications.services.email import EmailService

    application = Application.objects.get(id=application_id)

    EmailService.send_rejection_notification(
        email=application.email,
        brand=application.brand,
        model=application.model,
        reason=application.rejection_reason,
    )
    SmsService.send_rejection_notification(
        phone=application.phone,
        brand=application.brand,
        reason=application.rejection_reason
    )


@shared_task
def send_contract_signed_notification(application_id: str) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.email import EmailService

    application = Application.objects.select_related(
        "contract").get(id=application_id)

    # Копия договора продавцу
    if application.email and application.contract.pdf_file:
        EmailService.send_contract_copy(
            email=application.email,
            pdf_path=application.contract.pdf_file.path,
            brand=application.brand,
            model=application.model,
        )

    # Уведомление администратору
    EmailService.send_contract_signed_admin_notification(application)


@shared_task
def send_new_application_notification(application_id: int) -> None:
    from apps.applications.models import Application
    from apps.notifications.services.email import EmailService

    application = Application.objects.get(id=application_id)
    EmailService.send_new_application_admin_notification(application)
