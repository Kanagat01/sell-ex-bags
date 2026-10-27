from django.db import transaction
from django.utils import timezone

from .models import DeliveryMethod, DeliveryRequest
from apps.applications.models import Application

NEEDS_ADDRESS = (DeliveryMethod.COURIER_MKAD, DeliveryMethod.COURIER_REGION)


class DeliveryService:

    @staticmethod
    def request_method(application: Application) -> DeliveryRequest:
        """Админ запрашивает у клиента способ передачи — создаёт (или
        переиспользует) запрос, чтобы ссылку можно было переслать повторно."""
        delivery_request, _ = DeliveryRequest.objects.get_or_create(application=application)
        return delivery_request

    @staticmethod
    @transaction.atomic
    def submit(delivery_request: DeliveryRequest, method: str, address: str = "") -> None:
        """Клиент подтверждает способ передачи по публичной ссылке"""
        if delivery_request.is_confirmed:
            raise ValueError("Способ передачи уже выбран")
        if delivery_request.is_expired():
            raise ValueError("Ссылка истекла")
        if method not in DeliveryMethod.values:
            raise ValueError("Неверный способ передачи")

        needs_address = method in NEEDS_ADDRESS
        if needs_address and not address.strip():
            raise ValueError("Укажите адрес")

        delivery_request.method = method
        delivery_request.address = address.strip() if needs_address else ""
        delivery_request.is_confirmed = True
        delivery_request.confirmed_at = timezone.now()
        delivery_request.save(update_fields=["method", "address", "is_confirmed", "confirmed_at"])
