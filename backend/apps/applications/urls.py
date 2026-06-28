from django.urls import path
from .views import *

urlpatterns = [
    # Публичный
    path("applications/", CreateApplicationView.as_view(), name="application-create"),
    # Админ
    path("admin/applications/", AdminApplicationListView.as_view(), name="admin-application-list"),
    path("admin/applications/<int:pk>/", AdminApplicationDetailView.as_view(), name="admin-application-detail"),
    path("admin/applications/<int:pk>/approve/", AdminApproveApplicationView.as_view(), name="admin-application-approve"),
    path("admin/applications/<int:pk>/reject/", AdminRejectApplicationView.as_view(), name="admin-application-reject"),
    path("admin/applications/<int:pk>/contract/", AdminContractPreviewView.as_view(), name="admin-contract-preview"),
    path("admin/applications/<int:pk>/send-act/", AdminSendActView.as_view(), name="admin-send-act"),
    path("admin/applications/<int:pk>/items/<int:item_pk>/", AdminUpdateApplicationItemView.as_view(), name="admin-application-item-update"),
]