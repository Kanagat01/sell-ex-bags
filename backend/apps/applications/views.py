from django.db.models import QuerySet
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView, RetrieveDestroyAPIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction
from apps.notifications.tasks import send_new_application_notification

from .models import Application, ApplicationItem, ApplicationStatus
from .serializers import (
    ApproveApplicationSerializer,
    ApplicationDetailSerializer,
    ApplicationItemSerializer,
    ApplicationListSerializer,
    CreateApplicationSerializer,
    RejectApplicationSerializer,
    UpdateApplicationItemSerializer,
)
from .services import ApplicationService


class CreateApplicationView(APIView):
    """POST /api/applications — публичный, продавец создаёт заявку"""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = CreateApplicationSerializer(
            data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        transaction.on_commit(
            lambda: send_new_application_notification.delay(application.id))
        return Response(
            {"detail": "Заявка принята! Мы рассмотрим её и свяжемся с вами в ближайшее время."},
            status=status.HTTP_201_CREATED,
        )


class AdminApplicationListView(ListAPIView):
    """GET /api/admin/applications — список заявок для админа"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    serializer_class = ApplicationListSerializer

    def get_queryset(self) -> QuerySet:
        queryset = Application.objects.prefetch_related(
            "items", "items__photos")

        # Фильтры
        status_filter = self.request.query_params.get("status")
        format_filter = self.request.query_params.get("deal_format")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if format_filter:
            queryset = queryset.filter(format=format_filter)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset


class AdminApplicationDetailView(RetrieveDestroyAPIView):
    """GET /api/admin/applications/:id — детали заявки
    DELETE /api/admin/applications/:id — удаление заявки (каскадно удаляет
    изделия, фото и документы; медиафайлы стираются сигналами post_delete)"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    serializer_class = ApplicationDetailSerializer
    queryset = Application.objects.prefetch_related("items", "items__photos", "documents")


class AdminApproveApplicationView(APIView):
    """POST /api/admin/applications/:id/approve"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: str) -> Response:
        application = Application.objects.get(pk=pk)

        if application.status != ApplicationStatus.NEW:
            return Response(
                {"detail": "Можно одобрить только новую заявку"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApproveApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ApplicationService.approve(
            application,
            serializer.validated_data["items"],
            new_format=serializer.validated_data.get("format"),
        )
        return Response({"detail": "Заявка одобрена, уведомление отправлено продавцу"})


class AdminRejectApplicationView(APIView):
    """POST /api/admin/applications/:id/reject"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: str) -> Response:
        application = Application.objects.get(pk=pk)

        if application.status not in (ApplicationStatus.NEW, ApplicationStatus.OFFER_SENT):
            return Response(
                {"detail": "Нельзя отклонить заявку в текущем статусе"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RejectApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ApplicationService.reject(
            application, serializer.validated_data["rejection_reason"])
        return Response({"detail": "Заявка отклонена"})


class AdminContractPreviewView(APIView):
    """GET /api/admin/applications/:id/contract/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request: Request, pk: int) -> Response:
        from apps.contracts.models import Document, DocumentType

        application = Application.objects.get(pk=pk)
        contract = Document.objects.filter(
            application=application,
            document_type=DocumentType.CONTRACT,
        ).first()

        if not contract or not contract.pdf_file:
            return Response(
                {"detail": "Договор ещё не сформирован"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"url": contract.pdf_file.url})


class AdminUpdateApplicationItemView(APIView):
    """PATCH /api/admin/applications/:pk/items/:item_pk/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def patch(self, request: Request, pk: int, item_pk: int) -> Response:
        try:
            item = ApplicationItem.objects.select_related("application").get(
                pk=item_pk, application_id=pk
            )
        except ApplicationItem.DoesNotExist:
            return Response({"detail": "Изделие не найдено"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateApplicationItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        item.refresh_from_db()
        return Response(ApplicationItemSerializer(item).data)


class ServiceApplicationsByPhoneView(ListAPIView):
    """GET /api/service/applications/?phone=X — для NestJS, защищён секретом"""

    permission_classes = [AllowAny]
    serializer_class = ApplicationDetailSerializer

    def get_queryset(self) -> QuerySet:
        from django.conf import settings
        from rest_framework.exceptions import PermissionDenied
        secret = self.request.headers.get("X-Service-Secret", "")
        if not secret or secret != settings.SELL_SERVICE_SECRET:
            raise PermissionDenied()

        phone = self.request.query_params.get("phone", "").strip()
        if not phone:
            return Application.objects.none()

        return Application.objects.filter(phone=phone).prefetch_related(
            "items", "items__photos", "documents"
        )


class AdminSendActView(APIView):
    """POST /api/admin/applications/:id/send-act/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: int) -> Response:
        from apps.contracts.services import DocumentService
        from apps.notifications.services.sms import SmsService

        act_type = request.data.get("act_type")
        if not act_type:
            return Response(
                {"detail": "Укажите act_type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.conf import settings

        application = Application.objects.get(pk=pk)

        try:
            document = DocumentService.generate_act(application, act_type)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        sign_url = f"{settings.FRONTEND_URL}/sign/{document.sign_token}"
        SmsService.send_sign_link(
            phone=application.phone,
            document_type_display=document.get_document_type_display(),
            sign_url=sign_url,
        )

        return Response({
            "detail": "Акт сформирован, ссылка для подписания отправлена продавцу",
            "sign_token": str(document.sign_token),
        })
