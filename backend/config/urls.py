from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from config.views import dashboard_stats, health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/patients/", include("patients.urls")),
    path("api/v1/consultations/", include("consultations.urls")),
    path("api/v1/prescriptions/", include("prescriptions.urls")),
    # Dashboard
    path("api/v1/dashboard/stats/", dashboard_stats, name="dashboard-stats"),
    # Auth
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Health check
    path("api/health/", health_check, name="health-check"),
]
