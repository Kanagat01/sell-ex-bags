from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Application, ApplicationPhoto


def validate_max_words(value):
    if len(value.split()) > 100:
        raise ValidationError("Не более 100 слов разрешено.")


class ApplicationPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationPhoto
        fields = ["id", "file", "order"]


class CreateApplicationSerializer(serializers.ModelSerializer):
    """Публичный — продавец создаёт заявку"""

    model = serializers.CharField(required=False, allow_blank=True, default="")

    photos = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        min_length=3,
        max_length=10,
    )

    class Meta:
        model = Application
        fields = [
            "format",
            "brand",
            "model",
            "size",
            "condition",
            "defects_description",
            "desired_price",
            "phone",
            "email",
            "photos",
        ]

    def create(self, validated_data: dict) -> Application:
        photos = validated_data.pop("photos")
        application = Application.objects.create(**validated_data)

        for index, photo in enumerate(photos):
            ApplicationPhoto.objects.create(
                application=application,
                file=photo,
                order=index,
            )

        return application


class ApplicationListSerializer(serializers.ModelSerializer):
    """Список заявок для админа"""

    photos_count = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "format",
            "brand",
            "model",
            "condition",
            "desired_price",
            "offered_price",
            "phone",
            "status",
            "photos_count",
            "created_at",
        ]

    def get_photos_count(self, obj: Application) -> int:
        return obj.photos.count()


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Детальная карточка заявки для админа"""
    photos = ApplicationPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "format",
            "brand",
            "model",
            "size",
            "condition",
            "defects_description",
            "desired_price",
            "offered_price",
            "rejection_reason",
            "phone",
            "email",
            "status",
            "photos",
            "created_at",
            "updated_at",
        ]


class ApproveApplicationSerializer(serializers.Serializer):
    """Администратор одобряет заявку и указывает сумму"""

    offered_price = serializers.DecimalField(max_digits=12, decimal_places=2)


class RejectApplicationSerializer(serializers.Serializer):
    """Администратор отклоняет заявку"""

    rejection_reason = serializers.CharField(
        validators=[validate_max_words],
        required=False,
        allow_blank=True
    )
