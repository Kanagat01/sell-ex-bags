from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.applications.models import (
    Application, ApplicationCondition, ApplicationFormat, ApplicationItem, ApplicationStatus,
)
from apps.notifications import tasks
from .models import Offer


class MultiFormatOfferTests(TestCase):
    """Одобрение заявки сразу несколькими форматами и выбор формата клиентом"""

    def setUp(self):
        self.admin = APIClient()
        self.admin.force_authenticate(
            get_user_model().objects.create_superuser("admin", "admin@example.com", "pass")
        )
        self.client = APIClient()
        self.application = Application.objects.create(
            format=ApplicationFormat.COMMISSION, phone="+79990000000", email="seller@example.com",
        )
        self.bag = self._item("Saint Laurent", "Lou Lou", 0)
        self.wallet = self._item("Chanel", "Wallet", 1)

    def _item(self, brand, model, order):
        return ApplicationItem.objects.create(
            application=self.application, brand=brand, model=model,
            condition=ApplicationCondition.GOOD, desired_price=100000, order=order,
        )

    def _approve(self, options):
        with mock.patch("apps.applications.services.send_offer_notification"):
            return self.admin.post(
                f"/api/admin/applications/{self.application.pk}/approve/",
                {"options": options}, format="json",
            )

    def _three_options(self):
        return [
            {"format": "commission", "items": [
                {"id": self.bag.id, "offered_price": 120000},
                {"id": self.wallet.id, "offered_price": 50000},
            ]},
            {"format": "purchase", "items": [{"id": self.bag.id, "offered_price": 70000}]},
            {"format": "trade_in", "items": [{"id": self.bag.id, "offered_price": 90000}]},
        ]

    def test_single_option_behaves_as_before(self):
        response = self._approve([
            {"format": "purchase", "items": [{"id": self.bag.id, "offered_price": 70000}]},
        ])
        self.assertEqual(response.status_code, 200, response.data)
        self.application.refresh_from_db()
        self.bag.refresh_from_db()
        self.assertEqual(self.application.format, ApplicationFormat.PURCHASE)
        self.assertEqual(self.application.status, ApplicationStatus.OFFER_SENT)
        self.assertEqual(self.bag.offered_price, Decimal("70000"))

        token = self.application.offer.token
        offer = self.client.get(f"/api/offer/{token}/").data
        self.assertEqual([o["format"] for o in offer["options"]], ["purchase"])

        # формат можно не передавать, если вариант один
        self.assertEqual(self.client.post(f"/api/offer/{token}/accept/").status_code, 200)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, ApplicationStatus.ACCEPTED)

    def test_multiple_options_client_chooses_one(self):
        response = self._approve(self._three_options())
        self.assertEqual(response.status_code, 200, response.data)

        self.application.refresh_from_db()
        self.bag.refresh_from_db()
        # пока клиент не выбрал — формат заявки и цены не трогаем
        self.assertEqual(self.application.format, ApplicationFormat.COMMISSION)
        self.assertIsNone(self.bag.offered_price)

        detail = self.admin.get(f"/api/admin/applications/{self.application.pk}/").data
        self.assertEqual([o["format"] for o in detail["offer_options"]], ["purchase", "trade_in", "commission"])

        token = self.application.offer.token
        offer = self.client.get(f"/api/offer/{token}/").data
        self.assertEqual([o["format"] for o in offer["options"]], ["purchase", "trade_in", "commission"])
        self.assertEqual(len(offer["options"][2]["items"]), 2)

        # без выбора формата принять нельзя
        response = self.client.post(f"/api/offer/{token}/accept/")
        self.assertEqual(response.status_code, 400)

        response = self.client.post(f"/api/offer/{token}/accept/", {"format": "purchase"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)

        self.application.refresh_from_db()
        self.bag.refresh_from_db()
        self.wallet.refresh_from_db()
        self.assertEqual(self.application.format, ApplicationFormat.PURCHASE)
        self.assertEqual(self.application.status, ApplicationStatus.ACCEPTED)
        self.assertEqual(self.bag.offered_price, Decimal("70000"))
        # кошелёк не входит в вариант «Выкуп» — исключается из сделки
        self.assertIsNone(self.wallet.offered_price)
        self.assertTrue(Offer.objects.get(pk=self.application.offer.pk).is_used)

    def test_accept_rejects_format_not_in_offer(self):
        self._approve(self._three_options()[:2])
        token = self.application.offer.token
        response = self.client.post(f"/api/offer/{token}/accept/", {"format": "trade_in"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_approve_validation(self):
        other = Application.objects.create(format=ApplicationFormat.PURCHASE, phone="+70000000000")
        foreign = ApplicationItem.objects.create(
            application=other, brand="X", condition=ApplicationCondition.GOOD, desired_price=1,
        )
        cases = [
            [],
            [{"format": "purchase", "items": [{"id": self.bag.id, "offered_price": 1}]}] * 2,
            [{"format": "purchase", "items": [{"id": foreign.id, "offered_price": 1}]}],
        ]
        for options in cases:
            self.assertEqual(self._approve(options).status_code, 400, options)
        self.assertFalse(Offer.objects.filter(application=self.application).exists())

    @override_settings(FRONTEND_URL="https://sell.example")
    def test_notifications_list_options(self):
        self._approve(self._three_options())
        with mock.patch("apps.notifications.services.sms.SmsService._send") as send_sms:
            tasks.send_offer_email.apply(args=[str(self.application.id)]).get()
            tasks.send_offer_sms.apply(args=[str(self.application.id)]).get()

        body = mail.outbox[0].body
        self.assertIn("несколько вариантов", body)
        self.assertIn("Выкуп — 70 000 ₽", body)
        self.assertIn("Trade-In — депозит 90 000 ₽", body)
        # 120000 → 80000, 50000 → 30952 (НДС / 1,05, комиссия 30% и 35%)
        self.assertIn("Реализация — вы получите 110 952 ₽ после продажи", body)
        self.assertIn("  − Комиссия ex-bags (35%): 16 667 ₽", body)
        self.assertIn("Saint Laurent Lou Lou +1 изд.", mail.outbox[0].subject)
        self.assertIn("несколько вариантов", send_sms.call_args.args[1])

    @override_settings(FRONTEND_URL="https://sell.example")
    def test_single_commission_notification_shows_breakdown(self):
        self._approve([
            {"format": "commission", "items": [{"id": self.bag.id, "offered_price": 160000}]},
        ])
        with mock.patch("apps.notifications.services.sms.SmsService._send") as send_sms:
            tasks.send_offer_email.apply(args=[str(self.application.id)]).get()
            tasks.send_offer_sms.apply(args=[str(self.application.id)]).get()

        body = mail.outbox[0].body
        # 160000 / 1,05 = 152381 → НДС 7619, комиссия 30% = 45714, на руки 106667
        for line in [
            "Мы готовы принять на реализацию:",
            "• Saint Laurent Lou Lou",
            "  Сумма продажи: 160 000 ₽",
            "  − НДС 5%: 7 619 ₽",
            "  − Комиссия ex-bags (30%): 45 714 ₽",
            "  Вы получите: 106 667 ₽",
        ]:
            self.assertIn(line, body)
        self.assertNotIn("160000.00", body)
        self.assertIn("реализация за 160 000 ₽, вы получите 106 667 ₽ после продажи", send_sms.call_args.args[1])

    @override_settings(FRONTEND_URL="https://sell.example")
    def test_single_purchase_notification(self):
        self._approve([
            {"format": "purchase", "items": [{"id": self.bag.id, "offered_price": 70000}]},
        ])
        tasks.send_offer_email.apply(args=[str(self.application.id)]).get()
        body = mail.outbox[0].body
        self.assertIn("Мы готовы предложить вам 70 000 ₽ за:\n• Saint Laurent Lou Lou — 70 000 ₽", body)
