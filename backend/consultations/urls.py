from rest_framework.routers import DefaultRouter

from .views import ConsultationViewSet

app_name = "consultations"

router = DefaultRouter()
router.register("", ConsultationViewSet)

urlpatterns = router.urls
