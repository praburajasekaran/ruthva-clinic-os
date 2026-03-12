from django.urls import path

from . import views

# Authenticated endpoints (used by Sivanethram frontend)
app_urlpatterns = [
    path("journeys/start/", views.start_journey, name="integration-start-journey"),
    path("journeys/<int:journey_ref_id>/status/", views.journey_status, name="integration-journey-status"),
    path("journeys/<int:journey_ref_id>/confirm-visit/", views.confirm_visit, name="integration-confirm-visit"),
    path("patients/<int:patient_id>/journeys/", views.patient_journeys, name="integration-patient-journeys"),
]

# Webhook endpoint (called by Ruthva, no session auth)
webhook_urlpatterns = [
    path("ruthva/", views.webhook_receiver, name="integration-webhook-ruthva"),
]
