import json

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import *

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
            "defects_description", "desired_price", "offered_price",
            "order", "photos",
        ]


class CreateApplicationSerializer(serializers.Serializer):
    """Публичный — продавец создаёт заявку (multipart: items_data JSON + items_photos_N)"""

    format = serializers.ChoiceField(choices=ApplicationFormat.choices)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(
        required=False, allow_blank=True, default="")
    items_data = serializers.CharField()

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
        fields = ["id", "format", "phone", "status", "items", "created_at"]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Детальная карточка заявки для админа"""
    items = ApplicationItemSerializer(many=True, read_only=True)
    act_sent = serializers.SerializerMethodField()
    signed_documents = serializers.SerializerMethodField()

    def get_act_sent(self, obj):
        from apps.contracts.models import DocumentType
        if obj.status == ApplicationStatus.CONTRACT_SIGNED:
            return obj.documents.filter(document_type=DocumentType.ACCEPTANCE_ACT).exists()
        if obj.status == ApplicationStatus.ITEM_TRANSFERRED:
            return obj.documents.filter(document_type=DocumentType.RETURN_ACT).exists()
        return False

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
            "status", "items", "act_sent", "signed_documents", "created_at", "updated_at",
        ]


class ItemOfferPriceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    offered_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=1)


class ApproveApplicationSerializer(serializers.Serializer):
    """Администратор одобряет заявку и указывает суммы для каждого изделия"""
    items = ItemOfferPriceSerializer(many=True, min_length=1)


class RejectApplicationSerializer(serializers.Serializer):
    """Администратор отклоняет заявку"""

    rejection_reason = serializers.CharField(
        validators=[validate_max_words],
        required=False,
        allow_blank=True
    )
