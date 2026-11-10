from unittest import mock

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.notifications.services.sms import SmsService
from .models import Application, ApplicationFormat, ApplicationStatus
from .phone import normalize_phone
from .serializers import CreateApplicationSerializer


class NormalizePhoneTests(TestCase):
    def test_variants(self):
        for raw in [
            "89991234567", "8 (999) 123-45-67", "+7 (999) 123-45-67",
            "79991234567", "+79991234567", "9991234567", " 8-999-123-45-67 ",
        ]:
            self.assertEqual(normalize_phone(raw), "+79991234567", raw)

    def test_invalid(self):
        for raw in ["", "123", "999123456", "899912345678", "19991234567", None]:
            self.assertIsNone(normalize_phone(raw), raw)

    def test_create_serializer_accepts_only_plus7(self):
        serializer = CreateApplicationSerializer()
        self.assertEqual(serializer.validate_phone("+79991234567"), "+79991234567")
        for raw in ["89991234567", "79991234567", "+7 (999) 123-45-67", "+7999123456"]:
            with self.assertRaises(ValidationError, msg=raw):
                serializer.validate_phone(raw)

    @override_settings(SMSAERO_EMAIL="x", SMSAERO_API_KEY="y", SMS_BACKEND="smsaero")
    def test_sms_sent_to_7_instead_of_8(self):
        with mock.patch.object(SmsService, "_client") as client:
            SmsService._send("8 (999) 123-45-67", "текст")
        client.return_value.send_sms.assert_called_once_with(79991234567, "текст")

    @override_settings(SMSAERO_EMAIL="x", SMSAERO_API_KEY="y")
    def test_sms_invalid_number_raises(self):
        with mock.patch.object(SmsService, "_client"):
            with self.assertRaises(ValueError):
                SmsService._send("12345", "текст")

    @override_settings(SELL_SERVICE_SECRET="secret")
    def test_service_lookup_by_any_phone_format(self):
        Application.objects.create(format=ApplicationFormat.PURCHASE, phone="+79991234567")
        client = APIClient()
        for raw in ["89991234567", "+7 (999) 123-45-67"]:
            response = client.get(
                "/api/service/applications/", {"phone": raw}, HTTP_X_SERVICE_SECRET="secret",
            )
            self.assertEqual(response.status_code, 200)
            data = response.data["results"] if isinstance(response.data, dict) else response.data
            self.assertEqual(len(data), 1, raw)

    def test_public_application_requires_email(self):
        serializer = CreateApplicationSerializer(data={
            "format": "purchase", "phone": "+79991234567", "items_data": "[]",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class LinksDuplicatedToEmailTests(TestCase):
    """Ссылки клиенту (подпись, способ передачи) уходят по SMS и копией на почту."""

    def setUp(self):
        from django.contrib.auth import get_user_model

        self.admin = APIClient()
        self.admin.force_authenticate(get_user_model().objects.create_superuser("admin", "a@example.com", "pass"))
        self.application = Application.objects.create(
            format=ApplicationFormat.PURCHASE, phone="+79991234567", email="client@example.com",
            status=ApplicationStatus.ITEM_TRANSFERRED,
        )
        self.application.items.create(brand="Chanel", condition="good", offered_price=100000)

    def _post_closing_report(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return self.admin.post(
            f"/api/admin/applications/{self.application.pk}/closing-report/",
            {"file": SimpleUploadedFile("report.pdf", b"%PDF-1.4", content_type="application/pdf")},
        )

    def test_sign_link_sms_and_email(self):
        from apps.contracts.models import Document
        from apps.notifications import tasks

        with mock.patch.object(SmsService, "send_sign_link") as sms, \
                mock.patch.object(tasks.send_sign_link_email, "delay") as email_task, \
                self.captureOnCommitCallbacks(execute=True):
            response = self._post_closing_report()
        self.assertEqual(response.status_code, 200)
        document = Document.objects.get(sign_token=response.data["sign_token"])
        sms.assert_called_once()
        email_task.assert_called_once_with(document.id)

        tasks.send_sign_link_email.apply(args=[document.id]).get()
        self.assertEqual(mail.outbox[-1].to, ["client@example.com"])
        self.assertIn(document.sign_url, mail.outbox[-1].body)

    def test_every_sign_link_endpoint_sends_sms_and_email(self):
        from apps.contracts.models import Document, DocumentType
        from apps.contracts.services import DocumentService
        from apps.notifications import tasks
        from apps.offers.models import PersonalData

        self.application.personal_data = PersonalData.objects.create(
            full_name="Иванов Иван Иванович", date_of_birth="1990-01-01", passport_series="1234",
            passport_number="567890", passport_issued_by="ОВД", passport_issued_date="2010-01-01",
            registration_address="Москва", inn="770000000001", account_number="4" * 20,
            bank_name="Банк", bik="044525225", correspondent_account="3" * 20,
        )
        self.application.save()
        DocumentService.generate_contract(self.application)
        item_id = self.application.items.get().id
        base = f"/api/admin/applications/{self.application.pk}"
        requests = {
            DocumentType.RETURN_ACT: lambda: self.admin.post(f"{base}/send-act/", {"act_type": "return"}, format="json"),
            DocumentType.AMENDMENT: lambda: self.admin.post(
                f"{base}/send-amendment/", {"items": [{"item_id": item_id, "new_price": 90000}]}, format="json"),
            DocumentType.CLOSING_REPORT: self._post_closing_report,
        }
        for document_type, send in requests.items():
            with self.subTest(document_type):
                with mock.patch.object(SmsService, "send_sign_link") as sms, \
                        mock.patch.object(tasks.send_sign_link_email, "delay") as email_task:
                    with self.captureOnCommitCallbacks(execute=True):
                        response = send()
                    self.assertEqual(response.status_code, 200, response.data)
                    document = Document.objects.get(application=self.application, document_type=document_type)
                    self.assertEqual(response.data["sign_token"], str(document.sign_token))
                    sms.assert_called_once_with(
                        phone="+79991234567",
                        document_type_display=document.get_document_type_display(),
                        sign_url=f"http://localhost:3000/sign/{document.sign_token}",
                    )
                    email_task.assert_called_once_with(document.id)
                    document.refresh_from_db()
                    self.assertIsNotNone(document.sent_at)

            with self.subTest(f"{document_type}: SMS упала"):
                with mock.patch.object(SmsService, "send_sign_link", side_effect=RuntimeError("smsaero down")), \
                        mock.patch.object(tasks.send_sign_link_email, "delay") as email_task:
                    with self.captureOnCommitCallbacks(execute=True):
                        status_code = send().status_code
                    self.assertEqual(status_code, 502)
                    email_task.assert_not_called()

    def test_no_email_when_sms_failed(self):
        from apps.notifications import tasks

        with mock.patch.object(SmsService, "send_sign_link", side_effect=RuntimeError("smsaero down")), \
                mock.patch.object(tasks.send_sign_link_email, "delay") as email_task, \
                self.captureOnCommitCallbacks(execute=True):
            response = self._post_closing_report()
        self.assertEqual(response.status_code, 502)
        email_task.assert_not_called()

    def test_delivery_link_sms_and_email(self):
        from apps.delivery.models import DeliveryRequest
        from apps.notifications import tasks

        with mock.patch.object(SmsService, "send_delivery_request_link") as sms, \
                mock.patch.object(tasks.send_delivery_link_email, "delay") as email_task, \
                self.captureOnCommitCallbacks(execute=True):
            response = self.admin.post(f"/api/admin/applications/{self.application.pk}/request-delivery/")
        self.assertEqual(response.status_code, 200)
        delivery_request = DeliveryRequest.objects.get(token=response.data["token"])
        sms.assert_called_once()
        email_task.assert_called_once_with(delivery_request.id)

        tasks.send_delivery_link_email.apply(args=[delivery_request.id]).get()
        self.assertEqual(mail.outbox[-1].to, ["client@example.com"])
        self.assertIn(delivery_request.url, mail.outbox[-1].body)

    def test_no_email_address_no_letter(self):
        from apps.contracts.models import Document
        from apps.notifications import tasks

        self.application.email = ""
        self.application.save()
        with mock.patch.object(SmsService, "send_sign_link"):
            response = self._post_closing_report()
        document = Document.objects.get(sign_token=response.data["sign_token"])
        tasks.send_sign_link_email.apply(args=[document.id]).get()
        self.assertEqual(mail.outbox, [])
