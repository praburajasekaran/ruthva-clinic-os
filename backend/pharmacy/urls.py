from rest_framework.routers import DefaultRouter

from .views import DispensingViewSet, MedicineViewSet

app_name = "pharmacy"

router = DefaultRouter()
router.register("medicines", MedicineViewSet, basename="medicine")
router.register("dispensing", DispensingViewSet, basename="dispensing")
urlpatterns = router.urls
