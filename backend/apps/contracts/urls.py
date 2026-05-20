from django.urls import path
from .views import DocumentPreviewView, RequestSmsCodeView, ConfirmSignatureView

urlpatterns = [
    path("sign/<uuid:token>/", DocumentPreviewView.as_view(), name="document-preview"),
    path("sign/<uuid:token>/request-code/", RequestSmsCodeView.as_view(), name="document-request-code"),
    path("sign/<uuid:token>/confirm/", ConfirmSignatureView.as_view(), name="document-confirm"),
]