from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import ProcedureEntry, Prescription


@extend_schema(
    responses={200: inline_serializer(
        "HealthCheck",
        fields={"status": serializers.CharField(), "app": serializers.CharField()},
    )},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "app": "ayush-clinic-platform"})


@api_view(["GET"])
def dashboard_stats(request):
    clinic = getattr(request, "clinic", None)
    if not clinic:
        return Response({"detail": "No clinic context."}, status=403)

    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())

    # Consolidated aggregation
    consult_stats = (
        Consultation.objects.filter(clinic=clinic)
        .aggregate(
            today_patients=Count(
                "patient", filter=Q(consultation_date=today), distinct=True
            ),
            week_patients=Count(
                "patient", filter=Q(consultation_date__gte=week_start), distinct=True
            ),
            pending_prescriptions=Count(
                "id", filter=Q(consultation_date=today, prescription__isnull=True)
            ),
        )
    )

    follow_ups = (
        Prescription.objects.filter(clinic=clinic, follow_up_date__lte=today).count()
        + ProcedureEntry.objects.filter(
            prescription__clinic=clinic, follow_up_date__lte=today
        ).count()
    )

    return Response({
        **consult_stats,
        "follow_ups_due": follow_ups,
        "total_patients": Patient.objects.filter(clinic=clinic).count(),
    })


@api_view(["GET"])
def follow_ups_list(request):
    clinic = getattr(request, "clinic", None)
    if not clinic:
        return Response({"detail": "No clinic context."}, status=403)

    today = timezone.now().date()
    date_from = today - timedelta(days=30)
    date_to = today + timedelta(days=90)

    rx_follow_ups = (
        Prescription.objects.filter(
            clinic=clinic,
            follow_up_date__gte=date_from,
            follow_up_date__lte=date_to,
        )
        .select_related("consultation__patient")
        .order_by("follow_up_date")
    )

    proc_follow_ups = (
        ProcedureEntry.objects.filter(
            prescription__clinic=clinic,
            follow_up_date__gte=date_from,
            follow_up_date__lte=date_to,
        )
        .select_related("prescription__consultation__patient")
        .order_by("follow_up_date")
    )

    results = []
    for rx in rx_follow_ups:
        results.append({
            "type": "prescription",
            "follow_up_date": rx.follow_up_date,
            "patient_name": rx.consultation.patient.name,
            "patient_record_id": rx.consultation.patient.record_id,
            "patient_id": rx.consultation.patient.id,
            "notes": rx.follow_up_notes,
        })
    for proc in proc_follow_ups:
        results.append({
            "type": "procedure",
            "follow_up_date": proc.follow_up_date,
            "patient_name": proc.prescription.consultation.patient.name,
            "patient_record_id": proc.prescription.consultation.patient.record_id,
            "patient_id": proc.prescription.consultation.patient.id,
            "notes": proc.name,
        })

    results.sort(key=lambda x: x["follow_up_date"])
    return Response(results)
