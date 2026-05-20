import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class SmsService:
    BASE_URL = "https://lcab.smsint.ru/json/v1.0"

    @classmethod
    def _send(cls, phone: str, text: str) -> None:
        try:
            logger.info(f"Отправляем SMS на {phone}: {text}")
            phone = phone.lstrip("+")

            response = requests.post(
                f"{cls.BASE_URL}/sms/send/text",
                headers={
                    "X-Token": settings.SMS_INT_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "messages": [
                        {
                            "recipient": phone,
                            "text": text,
                        }
                    ],
                },
                timeout=10,
            )

            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                error = data.get("error", {})
                logger.error(f"SMS не отправлен: {error}")
            else:
                logger.info(f"SMS успешно отправлен: {data}")

        except requests.RequestException as e:
            logger.error(f"SMS отправка не удалась: {e}")

    @classmethod
    def send_offer_notification(cls, phone: str, short_label: str, amount: float, offer_url: str) -> None:
        text = f"Мы готовы предложить вам {amount} ₽ за {short_label}. Перейдите по ссылке: {offer_url}"
        cls._send(phone, text)

    @classmethod
    def send_rejection_notification(cls, phone: str, short_label: str, reason: str) -> None:
        text = f"К сожалению, мы не можем принять {short_label}.\nПричина: {reason}"
        cls._send(phone, text)

    @classmethod
    def send_sign_link(cls, phone: str, document_type_display: str, sign_url: str) -> None:
        text = f"{document_type_display} готов к подписанию. Ознакомьтесь и подпишите по ссылке: {sign_url}"
        cls._send(phone, text)

    @classmethod
    def send_sign_code(cls, phone: str, code: str) -> None:
        text = f"Код подписания документа: {code}. Действует 5 минут."
        cls._send(phone, text)
