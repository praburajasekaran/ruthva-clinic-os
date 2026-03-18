from django.db.models import Count, Max
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember

from .import_service import PatientImportService
from .models import Patient
from .serializers import PatientDetailSerializer, PatientListSerializer


class BulkPatientIdsSerializer(drf_serializers.Serializer):
    ids = drf_serializers.ListField(
        child=drf_serializers.IntegerField(), min_length=1, max_length=200
    )


class BulkToggleActiveSerializer(BulkPatientIdsSerializer):
    is_active = drf_serializers.BooleanField()


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
        patient = self.get_object()
        consultations = patient.consultations.all().order_by("-consultation_date")
        from consultations.serializers import ConsultationListSerializer

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
        result = svc.import_patients(
            content, skip_duplicates=skip_duplicates, user=request.user
        )

        # Ruthva sync (non-blocking, outside atomic transaction)
        ruthva_result = svc.sync_to_ruthva(user=request.user)
        result["ruthva_sync"] = ruthva_result

        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="import/retry-ruthva-sync")
    def retry_ruthva_sync(self, request):
        """Retry Ruthva sync for specific patient IDs."""
        patient_ids = request.data.get("patient_ids", [])
        if not patient_ids or len(patient_ids) > 200:
            return Response(
                {"error": "Provide 1-200 patient IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.conf import settings

        ruthva_url = getattr(settings, "RUTHVA_API_URL", "")
        if not ruthva_url:
            return Response(
                {"error": "Ruthva integration is not configured."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from integrations.services import RuthvaService

        patients = self.get_queryset().filter(id__in=patient_ids)
        svc = RuthvaService()
        synced = 0
        failed = 0
        failed_patient_ids = []

        for patient in patients:
            consultation = patient.consultations.filter(is_imported=True).first()
            # Default: 7 day followup, 28 day duration
            ref, error = svc.start_journey(
                clinic=request.clinic,
                patient=patient,
                consultation=consultation,
                duration_days=28,
                followup_interval_days=7,
            )
            if error:
                failed += 1
                failed_patient_ids.append(patient.id)
            else:
                synced += 1

        return Response({
            "synced": synced,
            "failed": failed,
            "failed_patient_ids": failed_patient_ids,
        })

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """Delete multiple patients by ID."""
        serializer = BulkPatientIdsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]

        deleted_count, _ = self.get_queryset().filter(id__in=ids).delete()
        return Response({"deleted": deleted_count})

    @action(detail=False, methods=["post"], url_path="bulk-toggle-active")
    def bulk_toggle_active(self, request):
        """Toggle is_active for multiple patients."""
        serializer = BulkToggleActiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]
        is_active = serializer.validated_data["is_active"]

        updated = self.get_queryset().filter(id__in=ids).update(is_active=is_active)
        return Response({"updated": updated})
