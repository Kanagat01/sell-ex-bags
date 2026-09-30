from django.db import transaction
from .models import Application, ApplicationItem, ApplicationStatus
from apps.offers.models import Offer
from apps.notifications.tasks import (
    send_offer_notification,
    send_rejection_notification,
)


class ApplicationService:

    @staticmethod
    @transaction.atomic
    def approve(application: Application, items_prices: list, new_format: str = None) -> Offer:
        price_map = {entry["id"]: entry["offered_price"] for entry in items_prices}
        items = list(ApplicationItem.objects.filter(application=application, id__in=price_map))
        for item in items:
            item.offered_price = price_map[item.id]
        ApplicationItem.objects.bulk_update(items, ["offered_price"])

        update_fields = ["status", "updated_at"]
        if new_format:
            application.format = new_format
            update_fields.append("format")
        application.status = ApplicationStatus.OFFER_SENT
        application.save(update_fields=update_fields)

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
