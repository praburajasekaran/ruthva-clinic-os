from django.db.models import Count, Max
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember

from .import_service import PatientImportService
from .models import Patient
from .serializers import PatientDetailSerializer, PatientListSerializer


class PatientViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    permission_classes = [IsClinicMember]
    queryset = Patient.objects.annotate(
        consultation_count=Count("consultations"),
        last_visit=Max("consultations__consultation_date"),
    )
    filterset_fields = ["gender", "blood_group", "is_active"]
    search_fields = ["name", "phone", "record_id"]
    ordering_fields = ["name", "created_at", "age"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        return PatientDetailSerializer

    def perform_create(self, serializer):
        clinic = self.request.clinic
        if clinic.active_patient_limit:
            active_count = Patient.objects.filter(
                clinic=clinic, is_active=True
            ).count()
            if active_count >= clinic.active_patient_limit:
                raise ValidationError(
                    f"Active patient limit reached ({clinic.active_patient_limit}). "
                    "Archive inactive patients or contact support to increase your limit."
                )
        serializer.save(clinic=clinic)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        patient = self.get_object()
        patient.is_active = not patient.is_active
        patient.save(update_fields=["is_active", "updated_at"])
        return Response({"is_active": patient.is_active})

    @action(detail=True, methods=["get"])
    def consultations(self, request, pk=None):
        from consultations.serializers import ConsultationListSerializer

        patient = self.get_object()
        consultations = patient.consultations.all().order_by("-consultation_date")
        serializer = ConsultationListSerializer(consultations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="import/preview")
    def import_preview(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
            )
        if not file.name.endswith(".csv"):
            return Response(
                {"error": "Only CSV files are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content = file.read().decode("utf-8-sig")  # Handle BOM
        svc = PatientImportService(request.clinic)
        preview = svc.validate_and_preview(content)
        return Response(preview)

    @action(detail=False, methods=["post"], url_path="import/confirm")
    def import_confirm(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
            )
        content = file.read().decode("utf-8-sig")
        skip_duplicates = request.data.get("skip_duplicates", True)
        svc = PatientImportService(request.clinic)
        result = svc.import_patients(content, skip_duplicates=skip_duplicates)
        return Response(result, status=status.HTTP_201_CREATED)
