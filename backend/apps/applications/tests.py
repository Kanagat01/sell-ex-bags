from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.notifications.services.sms import SmsService
from .models import Application, ApplicationFormat
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

    @override_settings(SMSAERO_EMAIL="x", SMSAERO_API_KEY="y")
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
