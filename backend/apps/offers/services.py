from django.db import transaction
from .models import Offer, PersonalData
from apps.applications.models import Application, ApplicationItem, ApplicationStatus
from apps.contracts.services import DocumentService


class OfferService:

    @staticmethod
    def get_valid_offer(token: str) -> Offer:
        """Получить активное предложение по токену"""
        try:
            offer = Offer.objects.select_related(
                "application").get(token=token)
        except Offer.DoesNotExist:
            raise ValueError("Предложение не найдено")

        if offer.is_expired():
            raise ValueError("Срок действия предложения истёк")

        if offer.is_used:
            raise ValueError("Предложение уже использовано")

        return offer

    @staticmethod
    @transaction.atomic
    def accept(offer: Offer, chosen_format: str | None = None) -> None:
        """Продавец принимает предложение. Если вариантов несколько — выбирает
        один формат; его формат и цены записываются в заявку."""
        options = dict(offer.get_options())
        if not options:
            raise ValueError("В предложении нет изделий")
        if chosen_format is None:
            if len(options) > 1:
                raise ValueError("Выберите формат сотрудничества")
            chosen_format = next(iter(options))
        if chosen_format not in options:
            raise ValueError("Этот формат не входит в предложение")

        application = offer.application
        price_map = {item.id: price for item, price in options[chosen_format]}
        items = list(application.items.all())
        for item in items:
            item.offered_price = price_map.get(item.id)
        ApplicationItem.objects.bulk_update(items, ["offered_price"])

        application.format = chosen_format
        application.status = ApplicationStatus.ACCEPTED
        application.save(update_fields=["format", "status", "updated_at"])
        offer.is_used = True
        offer.save(update_fields=["is_used"])

    @staticmethod
    @transaction.atomic
    def decline(offer: Offer) -> None:
        """Продавец отклоняет предложение"""
        offer.application.status = ApplicationStatus.DECLINED
        offer.application.save(update_fields=["status", "updated_at"])
        offer.is_used = True
        offer.save(update_fields=["is_used"])

    @staticmethod
    def get_personal_data_prefill(application: Application) -> PersonalData | None:
        """Для префилла формы: свои уже сохранённые данные по этой заявке,
        иначе — последние сохранённые под тем же телефоном с другой заявки
        (повторный продавец)."""
        own = PersonalData.objects.filter(application=application).first()
        if own:
            return own
        return (
            PersonalData.objects
            .filter(application__phone=application.phone)
            .order_by("-created_at")
            .first()
        )

    @staticmethod
    @transaction.atomic
    def save_personal_data(application: Application, data: dict) -> PersonalData:
        """Сохранить персональные данные и создать договор"""
        personal_data, _ = PersonalData.objects.update_or_create(
            application=application,
            defaults=data,
        )
        DocumentService.generate_contract(application)
        return personal_data
