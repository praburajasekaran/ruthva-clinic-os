from datetime import timedelta

from django.db.models import Max, Subquery, OuterRef
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import Prescription


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "app": "sivanethram"})


@api_view(["GET"])
@permission_classes([AllowAny])
def dashboard_stats(request):
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())

    return Response(
        {
            "today_patients": Consultation.objects.filter(
                consultation_date=today
            )
            .values("patient")
            .distinct()
            .count(),
            "week_patients": Consultation.objects.filter(
                consultation_date__gte=week_start
            )
            .values("patient")
            .distinct()
            .count(),
            "pending_prescriptions": Consultation.objects.filter(
                consultation_date=today, prescription__isnull=True
            ).count(),
            "follow_ups_due": Prescription.objects.filter(
                follow_up_date=today
            ).count(),
            "total_patients": Patient.objects.count(),
            "recent_patients": list(
                Patient.objects.annotate(
                    last_visit=Max("consultations__consultation_date"),
                    latest_complaint=Subquery(
                        Consultation.objects.filter(patient=OuterRef("pk"))
                        .order_by("-consultation_date", "-created_at")
                        .values("chief_complaints")[:1]
                    ),
                )
                .filter(last_visit__isnull=False)
                .order_by("-last_visit")
                .values(
                    "id", "name", "record_id", "age", "date_of_birth",
                    "last_visit", "latest_complaint",
                )[:10]
            ),
        }
    )
