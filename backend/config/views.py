from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import Prescription


@extend_schema(
    responses={200: inline_serializer(
        "HealthCheck",
        fields={"status": serializers.CharField(), "app": serializers.CharField()},
    )},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "app": "sivanethram"})


@extend_schema(
    responses={200: inline_serializer(
        "DashboardStats",
        fields={
            "today_patients": serializers.IntegerField(),
            "week_patients": serializers.IntegerField(),
            "pending_prescriptions": serializers.IntegerField(),
            "follow_ups_due": serializers.IntegerField(),
            "total_patients": serializers.IntegerField(),
        },
    )},
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())

    return Response({
        "today_patients": (
            Consultation.objects.filter(consultation_date=today)
            .values("patient")
            .distinct()
            .count()
        ),
        "week_patients": (
            Consultation.objects.filter(consultation_date__gte=week_start)
            .values("patient")
            .distinct()
            .count()
        ),
        "pending_prescriptions": Consultation.objects.filter(
            consultation_date=today, prescription__isnull=True
        ).count(),
        "follow_ups_due": Prescription.objects.filter(
            follow_up_date=today
        ).count(),
        "total_patients": Patient.objects.count(),
    })
