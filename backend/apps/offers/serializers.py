from rest_framework import serializers
from .models import Offer, PersonalData


class OfferPublicSerializer(serializers.ModelSerializer):
    """Данные предложения для продавца по токену"""

    brand = serializers.CharField(source="application.brand")
    model = serializers.CharField(source="application.model")
    format = serializers.CharField(source="application.format")
    offered_price = serializers.DecimalField(
        source="application.offered_price",
        max_digits=12,
        decimal_places=2,
    )

    class Meta:
        model = Offer
        fields = ["brand", "model", "format", "offered_price", "expires_at"]


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