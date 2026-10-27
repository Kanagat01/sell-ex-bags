import logging

from django.db.models import QuerySet
from django.utils import timezone
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
from .phone import normalize_phone
from .serializers import (
    ApproveApplicationSerializer,
    ApplicationDetailSerializer,
    ApplicationItemSerializer,
    ApplicationListSerializer,
    CreateApplicationSerializer,
    ManualCreateApplicationSerializer,
    RejectApplicationSerializer,
    UpdateApplicationItemSerializer,
)
from .services import ApplicationService

logger = logging.getLogger(__name__)


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
        queryset = Application.objects.select_related("personal_data").prefetch_related(
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
    queryset = Application.objects.select_related(
        "personal_data", "delivery_request"
    ).prefetch_related("items", "items__photos", "documents")


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

        try:
            ApplicationService.approve(application, serializer.validated_data["options"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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

        raw_phone = self.request.query_params.get("phone", "").strip()
        phone = normalize_phone(raw_phone) or raw_phone
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
        try:
            SmsService.send_sign_link(
                phone=application.phone,
                document_type_display=document.get_document_type_display(),
                sign_url=sign_url,
            )
        except Exception:
            logger.exception("Не удалось отправить SMS со ссылкой на подписание акта")
            return Response(
                {"detail": "Акт сформирован, но SMS со ссылкой не отправлено. Попробуйте отправить повторно."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        document.sent_at = timezone.now()
        document.save(update_fields=["sent_at"])

        return Response({
            "detail": "Акт сформирован, ссылка для подписания отправлена продавцу",
            "sign_token": str(document.sign_token),
        })


class AdminManualCreateApplicationView(APIView):
    """POST /api/admin/applications/manual/ — ручное создание заявки"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request: Request) -> Response:
        serializer = ManualCreateApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = ApplicationService.create_manual(serializer.validated_data)
        return Response(
            ApplicationDetailSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class AdminClientSearchView(ListAPIView):
    """GET /api/admin/clients/search/?q=... — поиск клиента по имени, телефону
    или ИНН для ручного создания заявки"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        from apps.offers.serializers import PersonalDataSearchResultSerializer
        return PersonalDataSearchResultSerializer

    def get_queryset(self) -> QuerySet:
        import re
        from django.db.models import Q
        from apps.offers.models import PersonalData

        q = self.request.query_params.get("q", "").strip()
        if not q:
            return PersonalData.objects.none()

        filters = Q(full_name__icontains=q) | Q(inn__icontains=q)
        # Телефон ищем по частичному совпадению цифр — не требуем полный
        # валидный номер, чтобы находить и по "999", и по кускам номера.
        digits = re.sub(r"\D", "", q)
        if digits:
            filters |= Q(applications__phone__icontains=digits)

        return PersonalData.objects.filter(filters).distinct().order_by("-created_at")[:50]


class AdminSendAmendmentView(APIView):
    """POST /api/admin/applications/:id/send-amendment/
    body: {items: [{item_id, new_price}, ...]} — одно или несколько изделий"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: int) -> Response:
        from decimal import Decimal, InvalidOperation
        from django.conf import settings
        from apps.contracts.services import DocumentService
        from apps.notifications.services.sms import SmsService

        application = Application.objects.get(pk=pk)

        entries = request.data.get("items")
        if not isinstance(entries, list) or not entries:
            return Response({"detail": "Выберите хотя бы одно изделие"}, status=status.HTTP_400_BAD_REQUEST)

        items = []
        seen = set()
        for entry in entries:
            try:
                item = application.items.get(pk=entry.get("item_id"))
            except (ApplicationItem.DoesNotExist, ValueError, TypeError, AttributeError):
                return Response({"detail": "Изделие не найдено"}, status=status.HTTP_400_BAD_REQUEST)
            if item.id in seen:
                return Response({"detail": "Изделие указано несколько раз"}, status=status.HTTP_400_BAD_REQUEST)
            seen.add(item.id)
            if item.offered_price is None:
                return Response(
                    {"detail": "У изделия ещё нет согласованной цены"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                new_price = Decimal(str(entry.get("new_price")))
            except (InvalidOperation, TypeError):
                return Response({"detail": "Укажите новую цену"}, status=status.HTTP_400_BAD_REQUEST)
            if new_price <= 0:
                return Response({"detail": "Цена должна быть больше нуля"}, status=status.HTTP_400_BAD_REQUEST)
            items.append({"item_id": item.id, "new_price": new_price})

        document = DocumentService.generate_amendment(application, items)

        sign_url = f"{settings.FRONTEND_URL}/sign/{document.sign_token}"
        try:
            SmsService.send_sign_link(
                phone=application.phone,
                document_type_display=document.get_document_type_display(),
                sign_url=sign_url,
            )
        except Exception:
            logger.exception("Не удалось отправить SMS со ссылкой на подписание доп. соглашения")
            return Response(
                {"detail": "Документ сформирован, но SMS со ссылкой не отправлено. Попробуйте отправить повторно."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        document.sent_at = timezone.now()
        document.save(update_fields=["sent_at"])

        return Response({
            "detail": "Доп. соглашение сформировано, ссылка для подписания отправлена продавцу",
            "sign_token": str(document.sign_token),
        })


class AdminSendClosingReportView(APIView):
    """POST /api/admin/applications/:id/closing-report/ (multipart, field "file")
    Сохраняет файл отчёта и сразу отправляет клиенту ссылку на подпись.
    Без файла — повторная отправка уже загруженного."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: int) -> Response:
        from django.conf import settings
        from apps.contracts.models import Document, DocumentType
        from apps.notifications.services.sms import SmsService

        application = Application.objects.get(pk=pk)
        file = request.FILES.get("file")
        document = Document.objects.filter(
            application=application,
            document_type=DocumentType.CLOSING_REPORT,
        ).first()

        if file:
            if document is None:
                document = Document(application=application, document_type=DocumentType.CLOSING_REPORT)
            document.pdf_file.save(file.name, file, save=False)
            document.is_signed = False
            document.signed_at = None
            document.signed_by_phone = ""
            document.save()
        elif not document or not document.pdf_file:
            return Response({"detail": "Выберите файл отчёта"}, status=status.HTTP_400_BAD_REQUEST)

        sign_url = f"{settings.FRONTEND_URL}/sign/{document.sign_token}"
        try:
            SmsService.send_sign_link(
                phone=application.phone,
                document_type_display=document.get_document_type_display(),
                sign_url=sign_url,
            )
        except Exception:
            logger.exception("Не удалось отправить SMS со ссылкой на подписание отчёта")
            return Response(
                {"detail": "SMS со ссылкой не отправлено. Попробуйте отправить повторно."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        document.sent_at = timezone.now()
        document.save(update_fields=["sent_at"])

        return Response({
            "detail": "Ссылка для подписания отчёта отправлена продавцу",
            "sign_token": str(document.sign_token),
        })


class AdminRequestDeliveryMethodView(APIView):
    """POST /api/admin/applications/:id/request-delivery/"""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request: Request, pk: int) -> Response:
        from django.conf import settings
        from apps.delivery.services import DeliveryService
        from apps.notifications.services.sms import SmsService

        application = Application.objects.get(pk=pk)
        delivery_request = DeliveryService.request_method(application)
        delivery_url = f"{settings.FRONTEND_URL}/delivery/{delivery_request.token}"

        try:
            SmsService.send_delivery_request_link(phone=application.phone, delivery_url=delivery_url)
        except Exception:
            logger.exception("Не удалось отправить SMS со ссылкой на выбор способа передачи")
            return Response(
                {"detail": "SMS со ссылкой не отправлено. Попробуйте отправить повторно."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            "detail": "Ссылка на выбор способа передачи отправлена продавцу",
            "token": str(delivery_request.token),
        })
