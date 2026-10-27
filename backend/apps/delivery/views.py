from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeliveryRequest
from .serializers import DeliveryRequestDetailSerializer, SubmitDeliveryRequestSerializer
from .services import DeliveryService
from apps.notifications.tasks import send_delivery_confirmed_notification


class DeliveryRequestDetailView(APIView):
    """GET /api/delivery/:token/ — публичная страница выбора способа передачи"""

    permission_classes = [AllowAny]

    def get(self, request: Request, token: str) -> Response:
        try:
            delivery_request = DeliveryRequest.objects.get(token=token)
        except DeliveryRequest.DoesNotExist:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)

        return Response(DeliveryRequestDetailSerializer(delivery_request).data)


class DeliveryRequestSubmitView(APIView):
    """POST /api/delivery/:token/submit/"""

    permission_classes = [AllowAny]

    def post(self, request: Request, token: str) -> Response:
        try:
            delivery_request = DeliveryRequest.objects.get(token=token)
        except DeliveryRequest.DoesNotExist:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubmitDeliveryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            DeliveryService.submit(
                delivery_request,
                serializer.validated_data["method"],
                serializer.validated_data["address"],
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        transaction.on_commit(
            lambda: send_delivery_confirmed_notification.delay(delivery_request.id))
        return Response({"detail": "Способ передачи подтверждён"})
