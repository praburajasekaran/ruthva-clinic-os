import logging
from dataclasses import dataclass

import requests
from django.conf import settings
from django.utils import timezone

from .models import RuthvaJourneyRef

logger = logging.getLogger(__name__)

RUTHVA_TIMEOUT = 10  # seconds


@dataclass
class RuthvaResponse:
    ok: bool
    status_code: int
    data: dict
    error: str = ""


class RuthvaService:
    """
    HTTP client for Ruthva Treatment Continuity Engine.
    Called from Sivanethram to start/manage treatment journeys.
    """

    def __init__(self):
        self.base_url = settings.RUTHVA_API_URL.rstrip("/")
        self.secret = settings.RUTHVA_INTEGRATION_SECRET
        self.subdomain = settings.RUTHVA_CLINIC_SUBDOMAIN

    def _headers(self):
        return {
            "Content-Type": "application/json",
            "X-Ruthva-Secret": self.secret,
            "X-Ruthva-Subdomain": self.subdomain,
        }

    def _request(self, method, path, json=None):
        """Make an authenticated request to Ruthva. Returns RuthvaResponse."""
        if not self.base_url:
            return RuthvaResponse(
                ok=False,
                status_code=0,
                data={},
                error="Ruthva integration is not configured. Set RUTHVA_API_URL in environment.",
            )
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(
                method=method,
                url=url,
                json=json,
                headers=self._headers(),
                timeout=RUTHVA_TIMEOUT,
            )
            try:
                data = response.json()
            except ValueError:
                data = {}

            if response.status_code >= 400:
                error_msg = data.get("message", data.get("error", f"HTTP {response.status_code}"))
                return RuthvaResponse(
                    ok=False,
                    status_code=response.status_code,
                    data=data,
                    error=error_msg,
                )

            return RuthvaResponse(
                ok=True,
                status_code=response.status_code,
                data=data,
            )

        except requests.Timeout:
            logger.error("Ruthva API timeout: %s %s", method, path)
            return RuthvaResponse(
                ok=False,
                status_code=0,
                data={},
                error="Ruthva is temporarily unavailable. Please try again.",
            )
        except requests.ConnectionError:
            logger.error("Ruthva API connection error: %s %s", method, path)
            return RuthvaResponse(
                ok=False,
                status_code=0,
                data={},
                error="Could not connect to Ruthva. Please try again later.",
            )
        except Exception as exc:
            logger.exception("Ruthva API unexpected error: %s %s", method, path)
            return RuthvaResponse(
                ok=False,
                status_code=0,
                data={},
                error=f"Unexpected error: {exc}",
            )

    def start_journey(self, *, clinic, patient, consultation, duration_days, followup_interval_days):
        """
        Start a treatment journey in Ruthva.

        Returns (RuthvaJourneyRef | None, error_message | None)
        """
        # Check for existing active journey
        existing = RuthvaJourneyRef.objects.filter(
            clinic=clinic,
            patient=patient,
            status=RuthvaJourneyRef.STATUS_ACTIVE,
        ).first()

        if existing:
            return None, f"Patient already has an active journey (ID: {existing.ruthva_journey_id})"

        phone = patient.whatsapp_number or patient.phone

        result = self._request("POST", "/api/integration/v1/journeys/start", json={
            "patientName": patient.name,
            "patientPhone": phone,
            "durationDays": duration_days,
            "followupIntervalDays": followup_interval_days,
            "consentGiven": True,
            "externalConsultationId": str(consultation.id) if consultation else None,
        })

        if not result.ok:
            # 409 means active journey exists in Ruthva — sync our state
            if result.status_code == 409 and "existingJourney" in result.data:
                existing_data = result.data["existingJourney"]
                ref, _ = RuthvaJourneyRef.objects.update_or_create(
                    ruthva_journey_id=existing_data["journeyId"],
                    defaults={
                        "clinic": clinic,
                        "patient": patient,
                        "status": existing_data.get("status", "active"),
                        "risk_level": existing_data.get("riskLevel", ""),
                    },
                )
                return None, f"Patient already has an active journey in Ruthva"

            return None, result.error

        # Success — store the journey reference
        data = result.data
        ref = RuthvaJourneyRef.objects.create(
            clinic=clinic,
            patient=patient,
            consultation=consultation,
            ruthva_journey_id=data["journeyId"],
            ruthva_patient_id=data.get("patientId", ""),
            status=data.get("status", RuthvaJourneyRef.STATUS_ACTIVE),
            start_date=data.get("startDate"),
            next_visit_date=data.get("nextVisitDate"),
            duration_days=duration_days,
            followup_interval_days=followup_interval_days,
            consent_given_at=timezone.now(),
            last_synced_at=timezone.now(),
        )

        return ref, None

    def get_journey_status(self, ruthva_journey_id):
        """Poll Ruthva for current journey status."""
        result = self._request("GET", f"/api/integration/v1/journeys/{ruthva_journey_id}/status")

        if not result.ok:
            return None, result.error

        return result.data, None

    def confirm_visit(self, ruthva_journey_id):
        """Notify Ruthva that a patient visit was confirmed."""
        result = self._request("POST", f"/api/integration/v1/journeys/{ruthva_journey_id}/confirm-visit")

        if not result.ok:
            return None, result.error

        # Update local reference
        data = result.data
        RuthvaJourneyRef.objects.filter(
            ruthva_journey_id=ruthva_journey_id,
        ).update(
            risk_level=data.get("riskLevel", "stable"),
            last_visit_date=data.get("lastVisitDate"),
            next_visit_date=data.get("nextVisitDate"),
            missed_visits=data.get("missedVisits", 0),
            last_synced_at=timezone.now(),
        )

        return data, None
