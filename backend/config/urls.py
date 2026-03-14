from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from clinics.urls import invite_urlpatterns
from config.views import (
    dashboard_stats,
    export_all_zip,
    export_consultations_csv,
    export_patients_csv,
    export_prescriptions_csv,
    follow_ups_list,
    health_check,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/patients/", include("patients.urls")),
    path("api/v1/consultations/", include("consultations.urls")),
    path("api/v1/prescriptions/", include("prescriptions.urls")),
    path("api/v1/treatments/", include("treatments.urls")),
    path("api/v1/pharmacy/", include("pharmacy.urls")),
    path("api/v1/team/", include("clinics.urls")),
    # Dashboard
    path("api/v1/dashboard/stats/", dashboard_stats, name="dashboard-stats"),
    path("api/v1/dashboard/follow-ups/", follow_ups_list, name="follow-ups-list"),
    # Data portability exports
    path("api/v1/export/patients/", export_patients_csv, name="export-patients"),
    path("api/v1/export/consultations/", export_consultations_csv, name="export-consultations"),
    path("api/v1/export/prescriptions/", export_prescriptions_csv, name="export-prescriptions"),
    path("api/v1/export/all/", export_all_zip, name="export-all"),
    # Auth
    path("api/v1/auth/", include("users.urls")),
    # Invitations (public endpoints)
    path("api/v1/invite/", include(invite_urlpatterns)),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Health check
    path("api/health/", health_check, name="health-check"),
]
