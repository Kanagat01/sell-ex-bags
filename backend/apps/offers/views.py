from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Offer
from .serializers import OfferPublicSerializer, PersonalDataSerializer
from .services import OfferService


class OfferDetailView(APIView):
    """GET /api/offer/:token — страница предложения для продавца"""

    permission_classes = [AllowAny]

    def get(self, request: Request, token: str) -> Response:
        try:
            offer = OfferService.get_valid_offer(token)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = OfferPublicSerializer(offer)
        return Response(serializer.data)


class OfferAcceptView(APIView):
    """POST /api/offer/:token/accept"""

    permission_classes = [AllowAny]

    def post(self, request: Request, token: str) -> Response:
        try:
            offer = OfferService.get_valid_offer(token)
            document = OfferService.accept(offer, str(request.data.get("format") or "") or None)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        payload = {"detail": "Предложение принято"}
        if document is not None:
            payload["sign_token"] = str(document.sign_token)
        return Response(payload)


class OfferDeclineView(APIView):
    """POST /api/offer/:token/decline"""

    permission_classes = [AllowAny]

    def post(self, request: Request, token: str) -> Response:
        try:
            offer = OfferService.get_valid_offer(token)
            OfferService.decline(offer)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Вы отказались от предложения"})


class PersonalDataView(APIView):
    """GET/POST /api/offer/:token/personal-data"""

    permission_classes = [AllowAny]

    def get(self, request: Request, token: str) -> Response:
        try:
            offer = Offer.objects.select_related("application").get(token=token)
        except Offer.DoesNotExist:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)

        prefill = OfferService.get_personal_data_prefill(offer.application)
        if prefill:
            return Response(PersonalDataSerializer(prefill).data)

        # Нет ни своих, ни чужих сохранённых данных — но если заявку создал
        # админ вручную для нового клиента, ФИО уже известно, подставляем его
        application = offer.application
        full_name = " ".join(filter(None, [
            application.last_name, application.first_name, application.middle_name,
        ]))
        if full_name:
            return Response({"full_name": full_name})
        return Response({})

    def post(self, request: Request, token: str) -> Response:
        try:
            offer = Offer.objects.select_related("application").get(token=token)
        except Offer.DoesNotExist:
            return Response({"detail": "Не найдено"}, status=status.HTTP_404_NOT_FOUND)

        serializer = PersonalDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        OfferService.save_personal_data(offer.application, serializer.validated_data)

        from apps.contracts.models import Document, DocumentType
        contract = Document.objects.filter(
            application=offer.application,
            document_type=DocumentType.CONTRACT,
        ).first()
        return Response({"detail": "Данные сохранены", "sign_token": str(contract.sign_token)})