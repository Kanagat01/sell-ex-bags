from django.db import transaction
from .models import Offer, PersonalData
from apps.applications.models import Application, ApplicationItem, ApplicationStatus
from apps.contracts.models import Document
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
    def accept(offer: Offer, chosen_format: str | None = None) -> Document | None:
        """Продавец принимает предложение (выбирает формат, если их несколько).
        Если клиент уже известен — сразу формирует договор и возвращает его."""
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

        if application.has_complete_personal_data:
            return DocumentService.generate_contract(application)
        return None

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
        if application.personal_data_id:
            return application.personal_data
        return (
            PersonalData.objects
            .filter(applications__phone=application.phone)
            .order_by("-created_at")
            .first()
        )

    @staticmethod
    @transaction.atomic
    def save_personal_data(application: Application, data: dict) -> PersonalData:
        """Сохраняет данные клиента (клиент = ИНН) и формирует договор.
        ИНН с другой датой рождения отклоняется — скорее всего, это опечатка в чужом ИНН."""
        match = PersonalData.objects.filter(inn=data["inn"]).first()
        if match and match.date_of_birth != data["date_of_birth"]:
            raise ValueError(
                "Этот ИНН уже зарегистрирован с другой датой рождения. "
                "Проверьте ИНН и дату рождения."
            )

        if match:
            for field, value in data.items():
                setattr(match, field, value)
            match.save()
            personal_data = match
        else:
            personal_data = PersonalData.objects.create(**data)

        application.personal_data = personal_data
        application.save(update_fields=["personal_data", "updated_at"])
        DocumentService.generate_contract(application)
        return personal_data
