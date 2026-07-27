import logging

from django.conf import settings
from smsaero import SmsAero, SmsAeroException

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
        try:
            number = int("".join(ch for ch in phone if ch.isdigit()))
            logger.info(f"Отправляем SMS на {number}: {text}")

            result = cls._client().send_sms(number, text)
            logger.info(f"SMS успешно отправлен: {result}")

        except SmsAeroException as e:
            logger.error(f"SMS отправка не удалась: {e}")
        except Exception as e:
            logger.error(
                f"SMS отправка не удалась (непредвиденная ошибка): {e}")

    @classmethod
    def send_offer_notification(cls, phone: str, short_label: str, amount: float, offer_url: str) -> None:
        text = f"Мы готовы предложить вам {amount} ₽ за {short_label} \nПерейдите по ссылке: {offer_url}"
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
