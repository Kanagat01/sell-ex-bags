import json
import re

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import *
from .phone import normalize_phone

PHOTO_MIN_COUNT = 3
PHOTO_MAX_COUNT = 10


def validate_max_words(value):
    if len(value.split()) > 100:
        raise ValidationError("Не более 100 слов разрешено.")


class ApplicationPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationPhoto
        fields = ["id", "file", "order"]


class ApplicationItemSerializer(serializers.ModelSerializer):
    photos = ApplicationPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = ApplicationItem
        fields = [
            "id", "brand", "model", "size", "condition",
            "defects_description",
            "desired_price", "offered_price",
            "order", "photos",
        ]


class CreateApplicationSerializer(serializers.Serializer):
    """Публичный — продавец создаёт заявку (multipart: items_data JSON + items_photos_N)"""

    format = serializers.ChoiceField(choices=ApplicationFormat.choices)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    trade_in_item_url = serializers.URLField(required=False, allow_blank=True, default="")
    trade_in_certificate_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, default=None
    )
    items_data = serializers.CharField()

    def validate_phone(self, value):
        if not re.fullmatch(r"\+7\d{10}", value):
            raise ValidationError("Номер в формате +7XXXXXXXXXX, например +79991234567")
        return value

    def validate_items_data(self, value):
        try:
            items = json.loads(value)
        except json.JSONDecodeError:
            raise ValidationError("Невалидный JSON в items_data")
        if not isinstance(items, list) or len(items) == 0:
            raise ValidationError("Необходимо добавить хотя бы одно изделие")
        return items

    def validate(self, attrs):
        request = self.context["request"]
        items = attrs["items_data"]
        photos_map = {}
        for i, _ in enumerate(items):
            files = request.FILES.getlist(f"items_photos_{i}")
            if len(files) < PHOTO_MIN_COUNT:
                raise ValidationError(
                    {f"items_photos_{i}": f"Минимум {PHOTO_MIN_COUNT} фото на изделие"})
            if len(files) > PHOTO_MAX_COUNT:
                raise ValidationError(
                    {f"items_photos_{i}": f"Максимум {PHOTO_MAX_COUNT} фото на изделие"})
            photos_map[i] = files
        attrs["_photos_map"] = photos_map
        return attrs

    def create(self, validated_data):
        photos_map = validated_data.pop("_photos_map")
        items_data = validated_data.pop("items_data")
        application = Application.objects.create(**validated_data)
        for order, meta in enumerate(items_data):
            item = ApplicationItem.objects.create(
                application=application,
                brand=meta.get("brand", ""),
                model=meta.get("model", ""),
                size=meta.get("size", ""),
                condition=meta.get("condition", ""),
                defects_description=meta.get("defects_description", ""),
                desired_price=meta.get("desired_price", 0),
                order=order,
            )
            for photo_order, photo_file in enumerate(photos_map.get(order, [])):
                ApplicationPhoto.objects.create(
                    application=application,
                    item=item,
                    file=photo_file,
                    order=photo_order,
                )
        return application


class ApplicationListSerializer(serializers.ModelSerializer):
    """Список заявок для админа"""
    items = ApplicationItemSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            "id", "format", "phone", "status", "items",
            "last_name", "first_name", "middle_name", "is_manual",
            "created_at",
        ]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Детальная карточка заявки для админа"""
    items = ApplicationItemSerializer(many=True, read_only=True)
    act_sent = serializers.SerializerMethodField()
    signed_documents = serializers.SerializerMethodField()
    offer_options = serializers.SerializerMethodField()
    personal_data = serializers.SerializerMethodField()
    amendment_sent = serializers.SerializerMethodField()
    closing_report = serializers.SerializerMethodField()
    delivery_request = serializers.SerializerMethodField()

    def get_act_sent(self, obj):
        from apps.contracts.models import DocumentType
        if obj.status == ApplicationStatus.CONTRACT_SIGNED:
            return obj.documents.filter(document_type=DocumentType.ACCEPTANCE_ACT).exists()
        if obj.status == ApplicationStatus.ITEM_TRANSFERRED:
            return obj.documents.filter(document_type=DocumentType.RETURN_ACT).exists()
        return False

    def get_personal_data(self, obj):
        pd = obj.personal_data
        if not pd:
            return None
        return {"id": pd.id, "full_name": pd.full_name, "inn": pd.inn}

    def get_amendment_sent(self, obj):
        from apps.contracts.models import DocumentType
        return obj.documents.filter(document_type=DocumentType.AMENDMENT).exists()

    def get_closing_report(self, obj):
        from apps.contracts.models import DocumentType
        doc = obj.documents.filter(document_type=DocumentType.CLOSING_REPORT).first()
        if not doc:
            return None
        return {
            "uploaded": bool(doc.pdf_file),
            "sent": doc.sent_at is not None,
            "is_signed": doc.is_signed,
            "sign_token": str(doc.sign_token),
        }

    def get_delivery_request(self, obj):
        dr = getattr(obj, "delivery_request", None)
        if not dr:
            return None
        return {
            "is_confirmed": dr.is_confirmed,
            "method": dr.method,
            "method_label": dr.get_method_display() if dr.method else "",
            "address": dr.address,
        }

    def get_offer_options(self, obj):
        """Отправленные клиенту варианты (пока он не выбрал один)"""
        offer = getattr(obj, "offer", None)
        if offer is None or obj.status != ApplicationStatus.OFFER_SENT:
            return []
        return [
            {
                "format": fmt,
                "items": [{"id": item.id, "price": str(price)} for item, price in option_items],
            }
            for fmt, option_items in offer.get_options()
        ]

    def get_signed_documents(self, obj):
        from apps.contracts.models import DocumentType
        result = []
        for doc in obj.documents.all():
            if not doc.pdf_file:
                continue
            if doc.is_signed or doc.document_type == DocumentType.CONTRACT:
                result.append({
                    "document_type": doc.document_type,
                    "label": doc.get_document_type_display(),
                    "url": doc.pdf_file.url,
                    "is_signed": doc.is_signed,
                })
        return result

    class Meta:
        model = Application
        fields = [
            "id", "format", "rejection_reason", "phone", "email",
            "last_name", "first_name", "middle_name", "is_manual", "personal_data",
            "status", "items", "act_sent", "signed_documents",
            "trade_in_item_url", "trade_in_certificate_amount",
            "offer_options", "amendment_sent", "closing_report", "delivery_request",
            "created_at", "updated_at",
        ]


class ItemOfferPriceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    offered_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=1)


class OfferOptionSerializer(serializers.Serializer):
    """Один вариант сотрудничества: формат и суммы по изделиям"""
    format = serializers.ChoiceField(choices=ApplicationFormat.choices)
    items = ItemOfferPriceSerializer(many=True, min_length=1)

    def validate_items(self, value):
        ids = [entry["id"] for entry in value]
        if len(ids) != len(set(ids)):
            raise ValidationError("Изделие указано несколько раз")
        return value


class ApproveApplicationSerializer(serializers.Serializer):
    """Администратор одобряет заявку: один или несколько форматов на выбор
    клиенту, для каждого — суммы по изделиям"""
    options = OfferOptionSerializer(many=True, min_length=1, max_length=len(ApplicationFormat.choices))

    def validate_options(self, value):
        formats = [option["format"] for option in value]
        if len(formats) != len(set(formats)):
            raise ValidationError("Формат указан несколько раз")
        return value


class RejectApplicationSerializer(serializers.Serializer):
    """Администратор отклоняет заявку"""

    rejection_reason = serializers.CharField(
        validators=[validate_max_words],
        required=False,
        allow_blank=True
    )


class UpdateApplicationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationItem
        fields = [
            "brand", "model", "size", "condition",
            "defects_description", "desired_price",
        ]


class ManualItemSerializer(serializers.Serializer):
    brand = serializers.CharField(max_length=100)
    model = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    size = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    condition = serializers.ChoiceField(choices=ApplicationCondition.choices)
    defects_description = serializers.CharField(required=False, allow_blank=True, default="")


class ManualCreateApplicationSerializer(serializers.Serializer):
    """Администратор создаёт заявку вручную от имени клиента, обратившегося
    вне платформы. Всё как в обычной заявке, кроме фото и желаемой цены;
    формат не выбирается — его задаст предложение."""

    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    middle_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    personal_data_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    items = ManualItemSerializer(many=True, min_length=1)

    def validate_phone(self, value):
        normalized = normalize_phone(value)
        if not normalized:
            raise ValidationError("Некорректный номер телефона")
        return normalized

    def validate_personal_data_id(self, value):
        if value is None:
            return value
        from apps.offers.models import PersonalData
        if not PersonalData.objects.filter(pk=value).exists():
            raise ValidationError("Клиент не найден")
        return value
