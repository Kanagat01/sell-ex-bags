from django.db import transaction
from .models import Application, ApplicationStatus
from apps.offers.models import Offer
from apps.notifications.tasks import (
    send_offer_notification,
    send_rejection_notification,
)


class ApplicationService:

    @staticmethod
    @transaction.atomic
    def approve(application: Application, offered_price) -> Offer:
        """Администратор одобряет заявку — создаём Offer и отправляем уведомление"""

        application.status = ApplicationStatus.OFFER_SENT
        application.offered_price = offered_price
        application.save(
            update_fields=["status", "offered_price", "updated_at"])

        offer = Offer.objects.create(application=application)

        transaction.on_commit(
            lambda: send_offer_notification.delay(str(application.id)))

        return offer

    @staticmethod
    @transaction.atomic
    def reject(application: Application, rejection_reason: str) -> None:
        """Администратор отклоняет заявку"""

        application.status = ApplicationStatus.DECLINED
        application.rejection_reason = rejection_reason
        application.save(
            update_fields=["status", "rejection_reason", "updated_at"])

        transaction.on_commit(
            lambda: send_rejection_notification.delay(str(application.id)))
