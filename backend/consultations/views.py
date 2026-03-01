from django.db.models import Exists, OuterRef
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly
from prescriptions.models import Prescription

from .import_service import ConsultationImportService
from .models import Consultation
from .serializers import ConsultationDetailSerializer, ConsultationListSerializer


class ConsultationViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    permission_classes = [IsClinicMember, IsDoctorOrReadOnly]
    queryset = Consultation.objects.select_related("patient").annotate(
        has_prescription=Exists(
            Prescription.objects.filter(consultation=OuterRef("pk"))
        )
    )
    filterset_fields = ["patient", "consultation_date"]
    search_fields = ["patient__name", "patient__record_id", "diagnosis"]
    ordering_fields = ["consultation_date", "created_at"]
    ordering = ["-consultation_date"]

    def get_serializer_class(self):
        if self.action == "list":
            return ConsultationListSerializer
        return ConsultationDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("retrieve", "update", "partial_update"):
            qs = qs.prefetch_related(
                "prescription__medications",
                "prescription__procedures",
            )
        return qs

    def perform_create(self, serializer):
        clinic = getattr(self.request, "clinic", None)
        if clinic is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No clinic context.")
        serializer.save(clinic=clinic, conducted_by=self.request.user)

    @extend_schema(
        request=None,
        responses=inline_serializer(
            "ConsultationImportPreviewResponse",
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
        service = ConsultationImportService(request.clinic, user=request.user)
        return Response(service.validate_and_preview(content))

    @extend_schema(
        request=None,
        responses=inline_serializer(
            "ConsultationImportConfirmResponse",
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
        service = ConsultationImportService(request.clinic, user=request.user)
        result = service.import_consultations(content, skip_duplicates=skip_duplicates)
        response_status = status.HTTP_201_CREATED
        if result.get("errors"):
            response_status = status.HTTP_400_BAD_REQUEST
        return Response(result, status=response_status)
