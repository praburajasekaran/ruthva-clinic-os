from rest_framework.routers import DefaultRouter

from .views import DoctorActionTaskViewSet, TreatmentPlanViewSet, TreatmentSessionViewSet

app_name = "treatments"

router = DefaultRouter()
router.register("plans", TreatmentPlanViewSet, basename="treatment-plan")
router.register("sessions", TreatmentSessionViewSet, basename="treatment-session")
router.register("doctor-tasks", DoctorActionTaskViewSet, basename="doctor-task")

urlpatterns = router.urls
