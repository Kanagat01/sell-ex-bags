import logging

from django.core.mail import EmailMessage
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailService:

    @staticmethod
    def send_offer_notification(
        email: str, short_label: str, items_text: str, amount, offer_url: str
    ) -> None:
        if not email:
            return
        msg = EmailMessage(
            subject=f"Предложение по вашей заявке — {short_label}",
            body=(
                f"Добрый день!\n\n"
                f"Мы готовы предложить вам {amount} ₽ за:\n{items_text}\n\n"
                f"Перейдите по ссылке, чтобы ознакомиться с условиями и принять решение:\n{offer_url}\n\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.send()

    @staticmethod
    def send_rejection_notification(
        email: str, short_label: str, items_text: str, reason: str
    ) -> None:
        if not email:
            return
        msg = EmailMessage(
            subject=f"Ответ по вашей заявке — {short_label}",
            body=(
                f"Добрый день!\n\n"
                f"К сожалению, мы не можем принять:\n{items_text}\n"
                f"Причина: {reason}\n\n"
                f"Спасибо за обращение!"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.send()

    @staticmethod
    def send_document_copy(email: str, pdf_path: str, document_type_display: str) -> None:
        if not email:
            return
        msg = EmailMessage(
            subject=f"Ваш документ — {document_type_display}",
            body=f"Добрый день!\n\nВо вложении ваш подписанный документ: {document_type_display}.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        with open(pdf_path, "rb") as f:
            msg.attach(f"document.pdf", f.read(), "application/pdf")
        msg.send()
