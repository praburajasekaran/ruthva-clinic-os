from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MedicineViewSet

app_name = "pharmacy"

router = DefaultRouter()
router.register("medicines", MedicineViewSet, basename="medicine")

urlpatterns = [
    path("", include(router.urls)),
]
