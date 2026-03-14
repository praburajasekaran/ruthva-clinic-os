from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly
from rest_framework import viewsets

from .models import Medicine
from .serializers import MedicineSerializer


class MedicineViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    permission_classes = [IsClinicMember, IsDoctorOrReadOnly]
    queryset = Medicine.objects.all()
    serializer_class = MedicineSerializer
    filterset_fields = ["category", "dosage_form", "is_active"]
    search_fields = ["name", "name_ta"]
    ordering = ["name"]

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.clinic)
