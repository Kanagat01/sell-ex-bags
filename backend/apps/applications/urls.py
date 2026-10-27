from django.urls import path
from .views import *

urlpatterns = [
    # Публичный
    path("applications/", CreateApplicationView.as_view(), name="application-create"),
    # Сервисный (NestJS → Django, защита X-Service-Secret)
    path("service/applications/", ServiceApplicationsByPhoneView.as_view(), name="service-applications-by-phone"),
    # Админ
    path("admin/applications/", AdminApplicationListView.as_view(), name="admin-application-list"),
    path("admin/applications/manual/", AdminManualCreateApplicationView.as_view(), name="admin-application-manual-create"),
    path("admin/clients/search/", AdminClientSearchView.as_view(), name="admin-client-search"),
    path("admin/applications/<int:pk>/", AdminApplicationDetailView.as_view(), name="admin-application-detail"),
    path("admin/applications/<int:pk>/approve/", AdminApproveApplicationView.as_view(), name="admin-application-approve"),
    path("admin/applications/<int:pk>/reject/", AdminRejectApplicationView.as_view(), name="admin-application-reject"),
    path("admin/applications/<int:pk>/contract/", AdminContractPreviewView.as_view(), name="admin-contract-preview"),
    path("admin/applications/<int:pk>/send-act/", AdminSendActView.as_view(), name="admin-send-act"),
    path("admin/applications/<int:pk>/send-amendment/", AdminSendAmendmentView.as_view(), name="admin-send-amendment"),
    path("admin/applications/<int:pk>/closing-report/", AdminSendClosingReportView.as_view(), name="admin-send-closing-report"),
    path("admin/applications/<int:pk>/request-delivery/", AdminRequestDeliveryMethodView.as_view(), name="admin-request-delivery"),
    path("admin/applications/<int:pk>/items/<int:item_pk>/", AdminUpdateApplicationItemView.as_view(), name="admin-application-item-update"),
]