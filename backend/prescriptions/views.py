import re

from django.db.models import Count
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly

from .models import Prescription, RemedyFollowUpResponse
from .pdf import generate_prescription_pdf
from .serializers import (
    PrescriptionDetailSerializer,
    PrescriptionListSerializer,
    RemedyFollowUpResponseSerializer,
)


class RemedyFollowUpResponseViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    permission_classes = [IsClinicMember, IsDoctorOrReadOnly]
    queryset = RemedyFollowUpResponse.objects.select_related(
        "prescription", "previous_prescription", "remedy_evaluated"
    )
    serializer_class = RemedyFollowUpResponseSerializer
    filterset_fields = ["prescription", "prescription__consultation__patient"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No clinic context.")
        serializer.save(clinic=clinic)


class PrescriptionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    permission_classes = [IsClinicMember, IsDoctorOrReadOnly]
    queryset = (
        Prescription.objects.select_related("consultation", "consultation__patient")
        .prefetch_related("medications", "procedures")
        .annotate(medication_count=Count("medications"))
    )
    filterset_fields = ["consultation__patient", "follow_up_date"]
    search_fields = [
        "consultation__patient__name",
        "consultation__patient__record_id",
    ]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return PrescriptionListSerializer
        return PrescriptionDetailSerializer

    def perform_create(self, serializer):
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No clinic context.")
        serializer.save(clinic=clinic)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        prescription = self.get_object()
        pdf_bytes = generate_prescription_pdf(prescription)
        patient_name = prescription.consultation.patient.name
        safe_name = re.sub(r"[^\w\s-]", "", patient_name).strip().replace(" ", "_")
        date_str = prescription.consultation.consultation_date.strftime("%Y-%m-%d")
        filename = f"{safe_name}_{date_str}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response
