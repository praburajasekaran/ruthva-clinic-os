from rest_framework.routers import DefaultRouter

from .views import PrescriptionViewSet, RemedyFollowUpResponseViewSet

app_name = "prescriptions"

router = DefaultRouter()
router.register("remedy-followup", RemedyFollowUpResponseViewSet, basename="remedy-followup")
router.register("", PrescriptionViewSet)

urlpatterns = router.urls
