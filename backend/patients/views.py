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

    @action(detail=True, methods=["get"], url_path="remedy-history")
    def remedy_history(self, request, pk=None):
        """Return chronological homeopathic remedy timeline for a patient."""
        from prescriptions.models import Prescription
        from prescriptions.serializers import RemedyFollowUpResponseSerializer

        patient = self.get_object()
        prescriptions = (
            Prescription.objects.filter(
                clinic=request.clinic,
                consultation__patient=patient,
            )
            .prefetch_related("medications", "remedy_followup_responses")
            .select_related("consultation")
            .order_by("consultation__consultation_date")
        )

        timeline = []
        for rx in prescriptions:
            homeo_meds = [
                m for m in rx.medications.all()
                if m.potency or m.dilution_scale or m.pellet_count
            ]
            if not homeo_meds:
                continue

            first_response = rx.remedy_followup_responses.first()
            timeline.append({
                "date": rx.consultation.consultation_date,
                "prescription_id": rx.id,
                "consultation_id": rx.consultation_id,
                "medications": [
                    {
                        "drug_name": m.drug_name,
                        "potency": m.potency,
                        "dilution_scale": m.dilution_scale,
                        "pellet_count": m.pellet_count,
                    }
                    for m in homeo_meds
                ],
                "response_at_next_visit": (
                    RemedyFollowUpResponseSerializer(first_response).data
                    if first_response
                    else None
                ),
            })

        return Response({
            "patient_id": patient.id,
            "patient_name": patient.name,
            "remedy_timeline": timeline,
        })

    @action(detail=False, methods=["get"])
    def check_phone(self, request):
        phone = request.query_params.get("phone", "")
        exclude = request.query_params.get("exclude", "")
        if len(phone) < 10:
            return Response([])
        qs = Patient.objects.filter(phone=phone)
        if exclude:
            qs = qs.exclude(pk=exclude)
        matches = qs.values("id", "name", "record_id")[:5]
        return Response(list(matches))

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
