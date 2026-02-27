from django.db.models import Count
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action

from clinics.mixins import TenantQuerySetMixin

from .models import Prescription
from .pdf import generate_prescription_pdf
from .serializers import PrescriptionDetailSerializer, PrescriptionListSerializer


class PrescriptionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
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
        filename = (
            f"rx-{prescription.consultation.patient.record_id}"
            f"-{prescription.consultation.consultation_date}.pdf"
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response
