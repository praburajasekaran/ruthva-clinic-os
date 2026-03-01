from django.db import transaction
from django.db.models import F
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from clinics.mixins import TenantQuerySetMixin
from clinics.permissions import IsClinicMember, IsDoctorOrReadOnly
from prescriptions.models import Prescription

from .models import DispensingItem, DispensingRecord, Medicine, StockEntry
from .serializers import (
    DispensingRecordCreateSerializer,
    DispensingRecordListSerializer,
    MedicineDetailSerializer,
    MedicineListSerializer,
    StockAdjustmentSerializer,
)


class MedicineViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    permission_classes = [IsClinicMember, IsDoctorOrReadOnly]
    queryset = Medicine.objects.all()
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "name_ta"]
    ordering_fields = ["name", "current_stock", "created_at"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.action == "list":
            return MedicineListSerializer
        return MedicineDetailSerializer

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        qs = self.get_queryset().filter(
            is_active=True,
            current_stock__lte=F("reorder_level"),
        )
        serializer = MedicineListSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="adjust-stock")
    def adjust_stock(self, request, pk=None):
        medicine = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            med = Medicine.objects.select_for_update().get(pk=medicine.pk)
            qty = serializer.validated_data["quantity"]
            med.current_stock = F("current_stock") + qty
            med.save(update_fields=["current_stock", "updated_at"])
            med.refresh_from_db()

            StockEntry.objects.create(
                medicine=med,
                entry_type=serializer.validated_data["entry_type"],
                quantity_change=qty,
                balance_after=med.current_stock,
                notes=serializer.validated_data.get("notes", ""),
                actor=request.user,
            )

        return Response(MedicineDetailSerializer(med).data)


class DispensingViewSet(TenantQuerySetMixin, viewsets.GenericViewSet):
    permission_classes = [IsClinicMember]
    queryset = DispensingRecord.objects.prefetch_related("items", "items__medicine")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DispensingRecordCreateSerializer
        return DispensingRecordListSerializer

    def list(self, request):
        prescription_id = request.query_params.get("prescription")
        qs = self.get_queryset()
        if prescription_id:
            qs = qs.filter(prescription_id=prescription_id)
        serializer = DispensingRecordListSerializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = DispensingRecordCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        clinic = request.clinic
        prescription_id = serializer.validated_data["prescription_id"]

        try:
            prescription = Prescription.objects.get(
                pk=prescription_id, clinic=clinic
            )
        except Prescription.DoesNotExist:
            raise drf_serializers.ValidationError(
                {"prescription_id": "Prescription not found."}
            )

        items_data = serializer.validated_data["items"]

        with transaction.atomic():
            record = DispensingRecord.objects.create(
                clinic=clinic,
                prescription=prescription,
                dispensed_by=request.user,
                notes=serializer.validated_data.get("notes", ""),
            )

            for item_data in items_data:
                med = Medicine.objects.select_for_update().get(
                    pk=item_data["medicine_id"], clinic=clinic
                )
                qty = item_data["quantity_dispensed"]

                if med.current_stock < qty:
                    raise drf_serializers.ValidationError(
                        f"Insufficient stock for {med.name}: "
                        f"available {med.current_stock}, requested {qty}"
                    )

                med.current_stock = F("current_stock") - qty
                med.save(update_fields=["current_stock", "updated_at"])
                med.refresh_from_db()

                DispensingItem.objects.create(
                    dispensing_record=record,
                    medicine=med,
                    drug_name_snapshot=med.name,
                    quantity_dispensed=qty,
                    unit_price_snapshot=med.unit_price,
                )

                StockEntry.objects.create(
                    medicine=med,
                    entry_type="dispense",
                    quantity_change=-qty,
                    balance_after=med.current_stock,
                    notes=f"Dispensed for Rx #{prescription.id}",
                    actor=request.user,
                )

        record = DispensingRecord.objects.prefetch_related(
            "items", "items__medicine"
        ).get(pk=record.pk)
        return Response(
            DispensingRecordListSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )
