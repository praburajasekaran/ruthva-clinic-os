from rest_framework.routers import DefaultRouter

from .views import TreatmentPlanViewSet, TreatmentSessionViewSet

app_name = "treatments"

router = DefaultRouter()
router.register("plans", TreatmentPlanViewSet, basename="treatment-plan")
router.register("sessions", TreatmentSessionViewSet, basename="treatment-session")

urlpatterns = router.urls
