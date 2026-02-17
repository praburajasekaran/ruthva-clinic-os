from django.db.models import Exists, OuterRef
from rest_framework import viewsets

from prescriptions.models import Prescription

from .models import Consultation
from .serializers import ConsultationDetailSerializer, ConsultationListSerializer


class ConsultationViewSet(viewsets.ModelViewSet):
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
