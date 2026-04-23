from django.db import transaction
from .models import Offer, PersonalData
from apps.applications.models import Application, ApplicationStatus
from apps.contracts.services import ContractService


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
    def accept(offer: Offer) -> None:
        """Продавец принимает предложение"""
        offer.application.status = ApplicationStatus.ACCEPTED
        offer.application.save(update_fields=["status", "updated_at"])
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
    @transaction.atomic
    def save_personal_data(application: Application, data: dict) -> PersonalData:
        """Сохранить персональные данные и создать договор"""
        personal_data, _ = PersonalData.objects.update_or_create(
            application=application,
            defaults=data,
        )
        ContractService.generate(application)
        return personal_data
