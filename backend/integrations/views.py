import hashlib
import hmac
import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from clinics.permissions import IsClinicMember
from consultations.models import Consultation
from patients.models import Patient

from .models import RuthvaJourneyRef
from .serializers import (
    RuthvaJourneyRefSerializer,
    StartJourneySerializer,
    WebhookEventSerializer,
)
from .services import RuthvaService

logger = logging.getLogger(__name__)


# ─── Authenticated endpoints (called by Sivanethram frontend) ────────────────


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClinicMember])
def start_journey(request):
    """
    POST /api/v1/integrations/journeys/start/

    Start a Ruthva treatment journey for a patient.
    Called from the consultation view when doctor clicks "Start Treatment Journey".
    """
    serializer = StartJourneySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    clinic = request.clinic
    if clinic is None:
        return Response(
            {"detail": "No clinic context."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Resolve patient
    try:
        patient = Patient.objects.get(
            id=serializer.validated_data["patient_id"],
            clinic=clinic,
        )
    except Patient.DoesNotExist:
        return Response(
            {"detail": "Patient not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Resolve consultation (optional)
    consultation = None
    consultation_id = serializer.validated_data.get("consultation_id")
    if consultation_id:
        try:
            consultation = Consultation.objects.get(
                id=consultation_id,
                clinic=clinic,
                patient=patient,
            )
        except Consultation.DoesNotExist:
            return Response(
                {"detail": "Consultation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    service = RuthvaService()
    ref, error = service.start_journey(
        clinic=clinic,
        patient=patient,
        consultation=consultation,
        duration_days=serializer.validated_data["duration_days"],
        followup_interval_days=serializer.validated_data["followup_interval_days"],
    )

    if error:
        return Response(
            {"detail": error},
            status=status.HTTP_409_CONFLICT if "active journey" in error else status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        RuthvaJourneyRefSerializer(ref).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicMember])
def journey_status(request, journey_ref_id):
    """
    GET /api/v1/integrations/journeys/<id>/status/

    Get current journey status from local ref. Optionally syncs from Ruthva.
    """
    clinic = request.clinic
    if clinic is None:
        return Response({"detail": "No clinic context."}, status=status.HTTP_403_FORBIDDEN)

    try:
        ref = RuthvaJourneyRef.objects.select_related("patient").get(
            id=journey_ref_id,
            clinic=clinic,
        )
    except RuthvaJourneyRef.DoesNotExist:
        return Response({"detail": "Journey not found."}, status=status.HTTP_404_NOT_FOUND)

    # Optionally refresh from Ruthva
    if request.query_params.get("sync") == "true":
        service = RuthvaService()
        data, error = service.get_journey_status(ref.ruthva_journey_id)
        if data:
            from django.utils import timezone

            ref.status = data.get("status", ref.status)
            ref.risk_level = data.get("riskLevel", ref.risk_level)
            ref.risk_reason = data.get("riskReason", ref.risk_reason)
            ref.next_visit_date = data.get("nextVisitDate", ref.next_visit_date)
            ref.last_visit_date = data.get("lastVisitDate", ref.last_visit_date)
            ref.missed_visits = data.get("missedVisits", ref.missed_visits)
            ref.last_synced_at = timezone.now()
            ref.save()

    return Response(RuthvaJourneyRefSerializer(ref).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClinicMember])
def confirm_visit(request, journey_ref_id):
    """
    POST /api/v1/integrations/journeys/<id>/confirm-visit/

    Doctor confirms patient visited. Forwards to Ruthva.
    """
    clinic = request.clinic
    if clinic is None:
        return Response({"detail": "No clinic context."}, status=status.HTTP_403_FORBIDDEN)

    try:
        ref = RuthvaJourneyRef.objects.get(
            id=journey_ref_id,
            clinic=clinic,
            status=RuthvaJourneyRef.STATUS_ACTIVE,
        )
    except RuthvaJourneyRef.DoesNotExist:
        return Response({"detail": "Active journey not found."}, status=status.HTTP_404_NOT_FOUND)

    service = RuthvaService()
    data, error = service.confirm_visit(ref.ruthva_journey_id)

    if error:
        return Response({"detail": error}, status=status.HTTP_502_BAD_GATEWAY)

    ref.refresh_from_db()
    return Response(RuthvaJourneyRefSerializer(ref).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClinicMember])
def patient_journeys(request, patient_id):
    """
    GET /api/v1/integrations/patients/<patient_id>/journeys/

    List all Ruthva journeys for a patient.
    """
    clinic = request.clinic
    if clinic is None:
        return Response({"detail": "No clinic context."}, status=status.HTTP_403_FORBIDDEN)

    refs = RuthvaJourneyRef.objects.filter(
        clinic=clinic,
        patient_id=patient_id,
    ).select_related("patient")

    return Response(RuthvaJourneyRefSerializer(refs, many=True).data)


# ─── Webhook endpoint (called by Ruthva, no auth session) ────────────────────


def _verify_webhook_secret(request):
    """Verify X-Ruthva-Secret header with timing-safe comparison."""
    received = request.META.get("HTTP_X_RUTHVA_SECRET", "")
    expected = getattr(settings, "RUTHVA_INTEGRATION_SECRET", "")

    if not received or not expected:
        return False

    return hmac.compare_digest(received.encode(), expected.encode())


@api_view(["POST"])
@authentication_classes([])  # No session/JWT auth — uses shared secret
@permission_classes([])  # Public endpoint, verified by secret
def webhook_receiver(request):
    """
    POST /api/v1/integrations/webhooks/ruthva/

    Receives status update webhooks from Ruthva.
    Bypasses TenantMiddleware and JWT auth — uses X-Ruthva-Secret.
    """
    if not _verify_webhook_secret(request):
        return Response(
            {"detail": "Invalid or missing X-Ruthva-Secret."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = WebhookEventSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    event = serializer.validated_data
    journey_id = event["journey_id"]
    event_type = event["event_type"]
    event_data = event.get("data", {})

    # Find the local journey reference
    try:
        ref = RuthvaJourneyRef.objects.get(ruthva_journey_id=journey_id)
    except RuthvaJourneyRef.DoesNotExist:
        # Unknown journey — acknowledge but log
        logger.warning("Webhook for unknown journey: %s", journey_id)
        return Response({"status": "ignored"})

    # Update based on event type
    from django.utils import timezone

    if event_type == "risk_level_changed":
        ref.risk_level = event_data.get("riskLevel", ref.risk_level)
        ref.risk_reason = event_data.get("riskReason", "")
        ref.missed_visits = event_data.get("missedVisits", ref.missed_visits)

    elif event_type == "visit_missed":
        ref.missed_visits = event_data.get("missedVisits", ref.missed_visits + 1)
        ref.risk_level = event_data.get("riskLevel", ref.risk_level)

    elif event_type == "journey_completed":
        ref.status = RuthvaJourneyRef.STATUS_COMPLETED

    elif event_type == "journey_dropped":
        ref.status = RuthvaJourneyRef.STATUS_DROPPED

    ref.last_synced_at = timezone.now()
    ref.save()

    return Response({"status": "ok"})
