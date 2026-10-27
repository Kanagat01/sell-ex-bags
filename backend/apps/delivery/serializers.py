from rest_framework import serializers

from .models import DeliveryMethod, DeliveryRequest


class DeliveryRequestDetailSerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryRequest
        fields = ["is_confirmed", "method", "address", "is_expired"]

    def get_is_expired(self, obj):
        return obj.is_expired()


class SubmitDeliveryRequestSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=DeliveryMethod.choices)
    address = serializers.CharField(required=False, allow_blank=True, default="")
