import logging

from django.conf import settings
from smsaero import SmsAero

from apps.applications.phone import normalize_phone

logger = logging.getLogger(__name__)


class SmsService:
    @staticmethod
    def _client() -> SmsAero:
        return SmsAero(
            settings.SMSAERO_EMAIL,
            settings.SMSAERO_API_KEY,
            # signature=settings.SMSAERO_SIGN,
        )

    @classmethod
    def _send(cls, phone: str, text: str) -> None:
        """Отправляет SMS. Бросает исключение при сбое — вызывающая задача
        должна поймать/повторить. Тихо пропускает только если сервис не настроен."""
        # SMSAero ждёт номер вида 79991234567 — «8…» и номера без кода
        # страны приводим к нему (старые заявки хранят номер как ввели).
        normalized = normalize_phone(phone)
        if normalized is None:
            raise ValueError(f"Некорректный номер телефона для SMS: {phone!r}")

        if settings.SMS_BACKEND == "console":
            logger.info(f"[SMS → {normalized}] {text}")
            print(f"\n===== SMS to {normalized} =====\n{text}\n===============================\n")
            return

        if not settings.SMSAERO_EMAIL or not settings.SMSAERO_API_KEY:
            logger.warning("SMSAero не настроен (SMSAERO_EMAIL/SMSAERO_API_KEY) — SMS пропущен")
            return

        number = int(normalized[1:])
        logger.info(f"Отправляем SMS на {number}: {text}")
        result = cls._client().send_sms(number, text)
        logger.info(f"SMS успешно отправлен: {result}")

    @classmethod
    def send_offer_notification(cls, phone: str, short_label: str, offer_text: str, offer_url: str) -> None:
        text = f"Предложение по {short_label}: {offer_text} \nПерейдите по ссылке: {offer_url}"
        cls._send(phone, text)

    @classmethod
    def send_offer_options_notification(cls, phone: str, short_label: str, offer_url: str) -> None:
        text = f"Мы подготовили несколько вариантов сотрудничества по {short_label} \nВыберите подходящий по ссылке: {offer_url}"
        cls._send(phone, text)

    @classmethod
    def send_rejection_notification(cls, phone: str, short_label: str, reason: str) -> None:
        text = f"К сожалению, мы не можем принять {short_label} \nПричина: {reason}"
        cls._send(phone, text)

    @classmethod
    def send_sign_link(cls, phone: str, document_type_display: str, sign_url: str) -> None:
        text = f"{document_type_display} готов к подписанию. Ознакомьтесь и подпишите по ссылке: {sign_url}"
        cls._send(phone, text)

    @classmethod
    def send_sign_code(cls, phone: str, code: str) -> None:
        text = f"Код подписания документа: {code}. Действует 5 минут."
        cls._send(phone, text)

    @classmethod
    def send_delivery_request_link(cls, phone: str, delivery_url: str) -> None:
        text = f"Выберите способ передачи сумки по ссылке: {delivery_url}"
        cls._send(phone, text)
