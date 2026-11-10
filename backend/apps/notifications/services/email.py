import logging

from django.core.mail import EmailMessage
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailService:

    @staticmethod
    def send_alert(subject: str, body: str) -> None:
        """Служебное письмо (авария/восстановление связи) на ALERT_EMAILS"""
        if not settings.ALERT_EMAILS:
            logger.warning("ALERT_EMAILS не задан — служебное письмо «%s» не отправлено", subject)
            return
        EmailMessage(
            subject=f"[sell.ex-bags] {subject}",
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=settings.ALERT_EMAILS,
        ).send()

    @staticmethod
    def send_offer_notification(
        email: str, short_label: str, offer_text: str, offer_url: str
    ) -> None:
        if not email:
            return
        msg = EmailMessage(
            subject=f"Предложение по вашей заявке — {short_label}",
            body=(
                f"Добрый день!\n\n"
                f"{offer_text}\n\n"
                f"Перейдите по ссылке, чтобы ознакомиться с условиями и принять решение:\n{offer_url}\n\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.send()

    @staticmethod
    def send_offer_options_notification(
        email: str, short_label: str, options_text: str, offer_url: str
    ) -> None:
        if not email:
            return
        msg = EmailMessage(
            subject=f"Предложение по вашей заявке — {short_label}",
            body=(
                f"Добрый день!\n\n"
                f"Мы подготовили для вас несколько вариантов сотрудничества:\n\n{options_text}\n\n"
                f"Перейдите по ссылке, чтобы ознакомиться с условиями и выбрать подходящий вариант:\n{offer_url}\n\n"
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
    def send_sign_link(email: str, document_type_display: str, sign_url: str) -> None:
        if not email:
            return
        EmailMessage(
            subject=f"{document_type_display} — подпишите документ",
            body=(
                f"Добрый день!\n\n"
                f"{document_type_display} готов к подписанию. Ознакомьтесь и подпишите по ссылке:\n"
                f"{sign_url}\n\n"
                f"Подписание — по коду из SMS, который придёт на ваш номер телефона."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        ).send()

    @staticmethod
    def send_delivery_request_link(email: str, delivery_url: str) -> None:
        if not email:
            return
        EmailMessage(
            subject="Выберите способ передачи сумки",
            body=(
                f"Добрый день!\n\n"
                f"Выберите удобный способ передачи сумки по ссылке:\n{delivery_url}"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        ).send()

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
