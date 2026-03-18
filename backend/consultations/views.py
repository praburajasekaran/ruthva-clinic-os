from django.db.models import Exists, OuterRef
from rest_framework import viewsets

from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly
from prescriptions.models import Prescription

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
