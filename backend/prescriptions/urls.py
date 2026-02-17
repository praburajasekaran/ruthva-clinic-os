from rest_framework.routers import DefaultRouter

from .views import PrescriptionViewSet

app_name = "prescriptions"

router = DefaultRouter()
router.register("", PrescriptionViewSet)

urlpatterns = router.urls
