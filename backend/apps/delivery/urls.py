from django.urls import path
from .views import DeliveryRequestDetailView, DeliveryRequestSubmitView

urlpatterns = [
    path("delivery/<uuid:token>/", DeliveryRequestDetailView.as_view(), name="delivery-detail"),
    path("delivery/<uuid:token>/submit/", DeliveryRequestSubmitView.as_view(), name="delivery-submit"),
]
