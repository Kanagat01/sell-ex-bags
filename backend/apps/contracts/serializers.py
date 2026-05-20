from rest_framework import serializers


class ConfirmSignatureSerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_code(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("Код должен состоять из цифр")
        return value
