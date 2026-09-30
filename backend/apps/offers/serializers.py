from rest_framework import serializers
from .models import Offer, PersonalData


class OfferPublicSerializer(serializers.ModelSerializer):
    """Данные предложения для продавца по токену. options — варианты
    сотрудничества (один или несколько), клиент выбирает один."""

    trade_in_item_url = serializers.CharField(source="application.trade_in_item_url")
    trade_in_certificate_amount = serializers.DecimalField(
        source="application.trade_in_certificate_amount",
        max_digits=12, decimal_places=2, allow_null=True,
    )
    options = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = ["trade_in_item_url", "trade_in_certificate_amount", "options", "expires_at"]

    def get_options(self, obj):
        return [
            {
                "format": fmt,
                "items": [
                    {"brand": item.brand, "model": item.model, "offered_price": str(price)}
                    for item, price in option_items
                ],
            }
            for fmt, option_items in obj.get_options()
        ]


class PersonalDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalData
        fields = [
            "full_name",
            "date_of_birth",
            "passport_series",
            "passport_number",
            "passport_issued_by",
            "passport_issued_date",
            "registration_address",
            "inn",
            "account_number",
            "bank_name",
            "bik",
            "correspondent_account",
        ]

    def validate_passport_series(self, value: str) -> str:
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Серия паспорта — 4 цифры")
        return value

    def validate_passport_number(self, value: str) -> str:
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("Номер паспорта — 6 цифр")
        return value

    def validate_inn(self, value: str) -> str:
        if value and (not value.isdigit() or len(value) != 12):
            raise serializers.ValidationError("ИНН — 12 цифр")
        return value