import random
import string
from io import BytesIO
from decimal import Decimal
from num2words import num2words
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from django.template.loader import render_to_string

from apps.applications.models import Application, ApplicationFormat, ApplicationStatus
from apps.notifications.tasks import send_document_signed_notification
from .models import Document, DocumentType, SmsCode


CONTRACT_TEMPLATE_MAP = {
    ApplicationFormat.PURCHASE: "contracts/purchase.html",
    ApplicationFormat.TRADE_IN: "contracts/tradein.html",
    ApplicationFormat.COMMISSION: "contracts/commission.html",
}

ACT_TEMPLATE_MAP = {
    ApplicationFormat.PURCHASE: {
        DocumentType.ACCEPTANCE_ACT: "contracts/acts/purchase_acceptance.html",
        DocumentType.RETURN_ACT: "contracts/acts/purchase_return.html",
    },
    ApplicationFormat.TRADE_IN: {
        DocumentType.ACCEPTANCE_ACT: "contracts/acts/tradein_acceptance.html",
    },
    ApplicationFormat.COMMISSION: {
        DocumentType.ACCEPTANCE_ACT: "contracts/acts/commission_acceptance.html",
        DocumentType.RETURN_ACT: "contracts/acts/commission_return.html",
    },
}


def amount_to_words(value: Decimal) -> str:
    rubles = int(value)
    kopeks = int((value - rubles) * 100)

    words = num2words(rubles, lang="ru")

    if kopeks == 0:
        return words
    else:
        # убираем trailing 0 → 50 → 5
        kopeks_str = str(kopeks).rstrip('0')
        return f"{words} целых {kopeks_str} сотых"


class DocumentService:

    @staticmethod
    def _generate_document_number(document: Document) -> str:
        created = timezone.localtime(document.created_at)
        day_start = created.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        sequence = Document.objects.filter(
            document_type=document.document_type,
            created_at__gte=day_start,
            created_at__lt=day_end,
            id__lte=document.id,
        ).count()
        return f"{created.month}-{created.day}-{sequence}"

    @staticmethod
    def _build_context(application: Application, document: Document) -> dict:
        application = Application.objects.select_related("personal_data").prefetch_related("items").get(pk=application.pk)
        personal_data = application.personal_data
        items = list(application.items.all())
        total_offered = sum(
            (item.offered_price for item in items if item.offered_price),
            Decimal("0"),
        )
        return {
            "seller_fullname": personal_data.full_name,
            "seller_passport": f"{personal_data.passport_series} {personal_data.passport_number}",
            "seller_passport_issued_by": personal_data.passport_issued_by,
            "seller_passport_date": personal_data.passport_issued_date.strftime("%d.%m.%Y"),
            "seller_inn": personal_data.inn,
            "seller_dob": personal_data.date_of_birth.strftime("%d.%m.%Y"),
            "seller_address": personal_data.registration_address,
            "seller_phone": application.phone,
            "seller_email": application.email,
            "items": items,
            "contract_amount": total_offered.normalize(),
            "contract_amount_words": amount_to_words(total_offered),
            "document_date": document.created_at,
            "document_number": document.document_number,
            "account_number": personal_data.account_number,
            "bank_name": personal_data.bank_name,
            "bik": personal_data.bik,
            "correspondent_account": personal_data.correspondent_account,
            "signed_at": document.signed_at,
        }

    @staticmethod
    def generate_contract(application: Application) -> Document:
        from weasyprint import HTML

        document, _ = Document.objects.get_or_create(
            application=application,
            document_type=DocumentType.CONTRACT,
        )
        if not document.document_number:
            document.document_number = DocumentService._generate_document_number(document)
            document.save(update_fields=["document_number"])

        context = DocumentService._build_context(application, document)
        html_string = render_to_string(CONTRACT_TEMPLATE_MAP[application.format], context)
        pdf_bytes = HTML(string=html_string).write_pdf()
        document.pdf_file.save(f"contract_{application.pk}.pdf", BytesIO(pdf_bytes), save=True)
        return document

    @staticmethod
    def generate_act(application: Application, act_type: str) -> Document:
        from weasyprint import HTML

        format_acts = ACT_TEMPLATE_MAP.get(application.format, {})
        if act_type not in format_acts:
            raise ValueError(
                f"Акт «{DocumentType(act_type).label}» недоступен для формата «{application.get_format_display()}»"
            )

        document, _ = Document.objects.get_or_create(
            application=application,
            document_type=act_type,
        )
        context = DocumentService._build_context(application, document)
        html_string = render_to_string(format_acts[act_type], context)
        pdf_bytes = HTML(string=html_string).write_pdf()
        document.pdf_file.save(f"act_{act_type}_{application.pk}.pdf", BytesIO(pdf_bytes), save=True)
        return document

    @staticmethod
    def request_sms_code(document: Document) -> SmsCode:
        ttl = settings.SMS_CODE_TTL_MINUTES
        max_sends = settings.SMS_CODE_MAX_SENDS_PER_DAY

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        sends_today = SmsCode.objects.filter(
            document=document,
            created_at__gte=today_start,
        ).count()

        if sends_today >= max_sends:
            raise ValueError("Превышен лимит отправок кода в сутки")

        code = "".join(random.choices(string.digits, k=6))
        return SmsCode.objects.create(
            document=document,
            phone=document.application.phone,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=ttl),
        )

    @staticmethod
    def confirm_signature(document: Document, code: str) -> None:
        max_attempts = settings.SMS_CODE_MAX_ATTEMPTS

        sms_code = (
            SmsCode.objects.filter(document=document, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not sms_code:
            raise ValueError("Код не найден. Запросите новый")
        if timezone.now() > sms_code.expires_at:
            raise ValueError("Срок действия кода истёк")
        if sms_code.attempts >= max_attempts:
            raise ValueError("Превышено количество попыток")

        sms_code.attempts += 1

        if sms_code.code != code:
            sms_code.save(update_fields=["attempts"])
            remaining = max_attempts - sms_code.attempts
            raise ValueError(f"Неверный код. Осталось попыток: {remaining}")

        sms_code.is_used = True
        sms_code.save(update_fields=["is_used", "attempts"])

        document.is_signed = True
        document.signed_at = timezone.now()
        document.signed_by_phone = sms_code.phone
        document.save(update_fields=["is_signed", "signed_at", "signed_by_phone"])

        status_map = {
            DocumentType.CONTRACT: ApplicationStatus.CONTRACT_SIGNED,
            DocumentType.ACCEPTANCE_ACT: ApplicationStatus.ITEM_TRANSFERRED,
            DocumentType.RETURN_ACT: ApplicationStatus.RETURN_PROCESSED,
        }
        new_status = status_map.get(document.document_type)
        if new_status:
            document.application.status = new_status
            document.application.save(update_fields=["status", "updated_at"])

        if document.document_type == DocumentType.CONTRACT:
            DocumentService.generate_contract(document.application)
        else:
            DocumentService.generate_act(document.application, document.document_type)

        send_document_signed_notification.delay(document.id)
