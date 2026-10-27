from django.db import transaction
from .models import Application, ApplicationItem, ApplicationStatus
from apps.offers.models import Offer, OfferPrice
from apps.notifications.tasks import (
    send_offer_notification,
    send_rejection_notification,
)


class ApplicationService:

    @staticmethod
    @transaction.atomic
    def create_manual(data: dict) -> Application:
        """Ручное создание заявки администратором (клиент обратился вне
        платформы). Как обычная заявка, но без фото, желаемой цены и
        формата — формат и цены админ задаёт на шаге предложения вариантов
        сотрудничества. Уведомление о «новой заявке» не шлётся — админ,
        создавший её, уже знает."""
        personal_data_id = data.get("personal_data_id")
        application = Application.objects.create(
            format="",
            phone=data["phone"],
            email=data["email"],
            is_manual=True,
            last_name="" if personal_data_id else data.get("last_name", ""),
            first_name="" if personal_data_id else data.get("first_name", ""),
            middle_name="" if personal_data_id else data.get("middle_name", ""),
            personal_data_id=personal_data_id,
        )
        ApplicationItem.objects.bulk_create([
            ApplicationItem(application=application, order=order, **item)
            for order, item in enumerate(data["items"])
        ])
        return application

    @staticmethod
    @transaction.atomic
    def approve(application: Application, options: list) -> Offer:
        """options: [{"format": ..., "items": [{"id", "offered_price"}]}].
        Один вариант — формат и цены сразу пишутся в заявку (как раньше).
        Несколько — клиент выберет один на странице оффера (OfferService.accept)."""
        item_ids = set(application.items.values_list("id", flat=True))
        for option in options:
            unknown = {entry["id"] for entry in option["items"]} - item_ids
            if unknown:
                raise ValueError("Изделие не относится к заявке")

        offer = Offer.objects.create(application=application)
        OfferPrice.objects.bulk_create([
            OfferPrice(offer=offer, item_id=entry["id"], format=option["format"], price=entry["offered_price"])
            for option in options
            for entry in option["items"]
        ])

        update_fields = ["status", "updated_at"]
        if len(options) == 1:
            price_map = {entry["id"]: entry["offered_price"] for entry in options[0]["items"]}
            items = list(ApplicationItem.objects.filter(id__in=price_map))
            for item in items:
                item.offered_price = price_map[item.id]
            ApplicationItem.objects.bulk_update(items, ["offered_price"])
            application.format = options[0]["format"]
            update_fields.append("format")
        application.status = ApplicationStatus.OFFER_SENT
        application.save(update_fields=update_fields)

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
