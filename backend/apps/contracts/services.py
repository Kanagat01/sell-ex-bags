import random
import string
from io import BytesIO
from decimal import Decimal
from num2words import num2words
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from django.template.loader import render_to_string

from apps.applications.models import Application, ApplicationStatus
from apps.notifications.tasks import send_contract_signed_notification
from .models import Contract, SmsCode


TEMPLATE_MAP = {
    "purchase": "contracts/purchase.html",
    "trade_in": "contracts/tradein.html",
    "commission": "contracts/commission.html",
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


class ContractService:

    @staticmethod
    def _generate_contract_number(contract: "Contract") -> str:
        created = contract.created_at
        day_start = created.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        sequence = Contract.objects.filter(
            created_at__gte=day_start,
            created_at__lt=day_end,
            id__lte=contract.id,
        ).count()
        return f"{created.month}-{created.day}-{sequence}"

    @staticmethod
    def generate(application: Application) -> Contract:
        """Генерация PDF договора из HTML шаблона"""
        from weasyprint import HTML

        personal_data = application.personal_data
        contract, _ = Contract.objects.get_or_create(application=application)

        if not contract.contract_number:
            contract.contract_number = ContractService._generate_contract_number(contract)
            contract.save(update_fields=["contract_number"])

        template_name = TEMPLATE_MAP[application.format]

        context = {
            "seller_fullname": personal_data.full_name,
            "seller_passport": f"{personal_data.passport_series} {personal_data.passport_number}",
            "seller_passport_issued_by": personal_data.passport_issued_by,
            "seller_passport_date": personal_data.passport_issued_date.strftime("%d.%m.%Y"),
            "seller_inn": personal_data.inn,
            "seller_dob": personal_data.date_of_birth.strftime("%d.%m.%Y"),
            "seller_address": personal_data.registration_address,
            "seller_phone": application.phone,
            "seller_email": application.email,
            "product_brand": application.brand,
            "product_model": application.model,
            "product_size": application.size,
            "product_condition": application.get_condition_display(),
            "defects_description": application.defects_description,
            "contract_amount": application.offered_price.normalize(),
            "contract_amount_words": amount_to_words(application.offered_price),
            "contract_date": application.contract.created_at,
            "contract_number": contract.contract_number,
            "account_number": personal_data.account_number,
            "bank_name": personal_data.bank_name,
            "bik": personal_data.bik,
            "correspondent_account": personal_data.correspondent_account,
            "signed_at": application.contract.signed_at,
        }

        html_string = render_to_string(template_name, context)
        pdf_bytes = HTML(string=html_string).write_pdf()
        filename = f"contract_{application.pk}.pdf"
        contract.pdf_file.save(filename, BytesIO(pdf_bytes), save=True)

        return contract

    @staticmethod
    def request_sms_code(contract: Contract) -> SmsCode:
        """Создать новый SMS код для подписания"""

        ttl = settings.SMS_CODE_TTL_MINUTES
        max_sends = settings.SMS_CODE_MAX_SENDS_PER_DAY

        # Проверяем лимит отправок за сутки
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        sends_today = SmsCode.objects.filter(
            contract=contract,
            created_at__gte=today_start,
        ).count()

        if sends_today >= max_sends:
            raise ValueError("Превышен лимит отправок кода в сутки")

        code = "".join(random.choices(string.digits, k=6))

        sms_code = SmsCode.objects.create(
            contract=contract,
            phone=contract.application.phone,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=ttl),
        )

        return sms_code

    @staticmethod
    def confirm_signature(contract: Contract, code: str) -> None:
        """Подтвердить подпись кодом из SMS"""

        max_attempts = settings.SMS_CODE_MAX_ATTEMPTS

        sms_code = (
            SmsCode.objects.filter(
                contract=contract,
                is_used=False,
            )
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

        # Код верный — фиксируем подпись
        sms_code.is_used = True
        sms_code.save(update_fields=["is_used", "attempts"])

        contract.is_signed = True
        contract.signed_at = timezone.now()
        contract.signed_by_phone = sms_code.phone
        contract.save(update_fields=["is_signed",
                      "signed_at", "signed_by_phone"])

        contract.application.status = ApplicationStatus.CONTRACT_SIGNED
        contract.application.save(update_fields=["status", "updated_at"])

        ContractService.generate(contract.application)
        send_contract_signed_notification.delay(str(contract.application.id))
