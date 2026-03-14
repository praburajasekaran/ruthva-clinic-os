from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PrescriptionViewSet, RemedyFollowUpResponseViewSet

app_name = "prescriptions"

router = DefaultRouter()
router.register("remedy-followup", RemedyFollowUpResponseViewSet, basename="remedy-followup")
router.register("", PrescriptionViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
