import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import Document
from .serializers import ConfirmSignatureSerializer
from .services import DocumentService
from apps.notifications.services.sms import SmsService


class DocumentPreviewView(APIView):
    """GET /api/sign/<token>/ — получить PDF документа"""

    permission_classes = [AllowAny]

    def get(self, request: Request, token: str) -> Response:
        try:
            document = Document.objects.get(sign_token=token)
        except Document.DoesNotExist:
            return Response({"detail": "Документ не найден"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"url": document.pdf_file.url})


class RequestSmsCodeView(APIView):
    """POST /api/sign/<token>/request-code/"""

    permission_classes = [AllowAny]

    def post(self, request: Request, token: str) -> Response:
        try:
            document = Document.objects.select_related("application").get(sign_token=token)
        except Document.DoesNotExist:
            return Response({"detail": "Документ не найден"}, status=status.HTTP_404_NOT_FOUND)

        try:
            sms_code = DocumentService.request_sms_code(document)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            SmsService.send_sign_code(document.application.phone, sms_code.code)
        except Exception:
            logger.exception("Не удалось отправить SMS-код подписания")
            return Response(
                {"detail": "Не удалось отправить SMS. Попробуйте ещё раз."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"detail": "Код отправлен"})


class ConfirmSignatureView(APIView):
    """POST /api/sign/<token>/confirm/"""

    permission_classes = [AllowAny]

    def post(self, request: Request, token: str) -> Response:
        try:
            document = Document.objects.select_related("application").get(sign_token=token)
        except Document.DoesNotExist:
            return Response({"detail": "Документ не найден"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConfirmSignatureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            DocumentService.confirm_signature(document, serializer.validated_data["code"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": f"{document.get_document_type_display()} подписан(а)"})