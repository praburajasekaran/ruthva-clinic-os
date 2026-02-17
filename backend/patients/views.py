from django.db.models import Count, Max
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Patient
from .serializers import PatientDetailSerializer, PatientListSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.annotate(
        consultation_count=Count("consultations"),
        last_visit=Max("consultations__consultation_date"),
    )
    filterset_fields = ["gender", "blood_group"]
    search_fields = ["name", "phone", "record_id"]
    ordering_fields = ["name", "created_at", "age"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        return PatientDetailSerializer

    @action(detail=True, methods=["get"])
    def consultations(self, request, pk=None):
        from consultations.serializers import ConsultationListSerializer

        patient = self.get_object()
        consultations = patient.consultations.all().order_by("-consultation_date")
        serializer = ConsultationListSerializer(consultations, many=True)
        return Response(serializer.data)
