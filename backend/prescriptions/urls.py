from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PrescriptionViewSet

app_name = "prescriptions"

router = DefaultRouter()
router.register("", PrescriptionViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
