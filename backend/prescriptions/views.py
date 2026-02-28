from django.db.models import Count
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly

from .import_service import PrescriptionImportService
from .models import Prescription
from .pdf import generate_prescription_pdf
from .serializers import PrescriptionDetailSerializer, PrescriptionListSerializer


class PrescriptionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    permission_classes = [IsClinicMember, IsDoctorOrReadOnly]
    queryset = Prescription.objects.select_related(
        "consultation", "consultation__patient"
    ).annotate(
        medication_count=Count("medications"),
    )
    filterset_fields = ["consultation__patient", "follow_up_date"]
    search_fields = [
        "consultation__patient__name", "consultation__patient__record_id",
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
        patient = prescription.consultation.patient
        date = prescription.consultation.consultation_date
        filename = f"rx-{patient.record_id}-{date}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @extend_schema(
        request=None,
        responses=inline_serializer(
            "PrescriptionImportPreviewResponse",
            fields={
                "valid": serializers.BooleanField(),
                "total_rows": serializers.IntegerField(required=False),
                "error_count": serializers.IntegerField(required=False),
            },
        ),
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="import/preview",
        parser_classes=[MultiPartParser],
        permission_classes=[IsClinicMember],
    )
    def import_preview(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not file.name.endswith(".csv"):
            return Response(
                {"error": "Only CSV files are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = file.read().decode("utf-8-sig")
        skip_duplicates = str(request.data.get("skip_duplicates", "true")).lower() == "true"
        service = PrescriptionImportService(request.clinic)
        return Response(
            service.validate_and_preview(content, skip_duplicates=skip_duplicates)
        )

    @extend_schema(
        request=None,
        responses=inline_serializer(
            "PrescriptionImportConfirmResponse",
            fields={
                "created": serializers.IntegerField(),
                "skipped": serializers.IntegerField(),
                "errors": serializers.ListField(child=serializers.DictField()),
            },
        ),
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="import/confirm",
        parser_classes=[MultiPartParser],
        permission_classes=[IsClinicMember],
    )
    def import_confirm(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not file.name.endswith(".csv"):
            return Response(
                {"error": "Only CSV files are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = file.read().decode("utf-8-sig")
        skip_duplicates = str(request.data.get("skip_duplicates", "true")).lower() == "true"
        service = PrescriptionImportService(request.clinic)
        result = service.import_prescriptions(content, skip_duplicates=skip_duplicates)
        response_status = status.HTTP_201_CREATED
        if result.get("errors"):
            response_status = status.HTTP_400_BAD_REQUEST
        return Response(result, status=response_status)
