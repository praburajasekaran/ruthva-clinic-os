from rest_framework import serializers

from .models import DispensingItem, DispensingRecord, Medicine, StockEntry


# -- Medicine ------------------------------------------------------------------

class MedicineListSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Medicine
        fields = [
            "id", "name", "name_ta", "category", "dosage_form",
            "unit_price", "current_stock", "reorder_level",
            "is_active", "is_low_stock",
        ]

    def get_is_low_stock(self, obj):
        return obj.is_active and obj.current_stock <= obj.reorder_level


class StockEntrySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)

    class Meta:
        model = StockEntry
        fields = [
            "id", "entry_type", "quantity_change", "balance_after",
            "notes", "actor_name", "created_at",
        ]


class MedicineDetailSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.SerializerMethodField()
    recent_stock_entries = serializers.SerializerMethodField()

    class Meta:
        model = Medicine
        fields = [
            "id", "name", "name_ta", "category", "dosage_form",
            "unit_price", "current_stock", "reorder_level",
            "is_active", "is_low_stock", "recent_stock_entries",
            "created_at", "updated_at",
        ]
        read_only_fields = ["current_stock", "created_at", "updated_at"]

    def get_is_low_stock(self, obj):
        return obj.is_active and obj.current_stock <= obj.reorder_level

    def get_recent_stock_entries(self, obj):
        entries = obj.stock_entries.all()[:10]
        return StockEntrySerializer(entries, many=True).data


class StockAdjustmentSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
    entry_type = serializers.ChoiceField(choices=["purchase", "adjustment"])
    notes = serializers.CharField(required=False, allow_blank=True, default="")


# -- Dispensing ----------------------------------------------------------------

class DispensingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DispensingItem
        fields = [
            "id", "medicine", "drug_name_snapshot",
            "quantity_dispensed", "unit_price_snapshot",
        ]
        read_only_fields = ["drug_name_snapshot", "unit_price_snapshot"]


class DispensingItemCreateSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    quantity_dispensed = serializers.IntegerField(min_value=1)


class DispensingRecordListSerializer(serializers.ModelSerializer):
    dispensed_by_name = serializers.CharField(
        source="dispensed_by.get_full_name", read_only=True
    )
    items = DispensingItemSerializer(many=True, read_only=True)

    class Meta:
        model = DispensingRecord
        fields = [
            "id", "prescription", "dispensed_by_name",
            "notes", "items", "created_at",
        ]


class DispensingRecordCreateSerializer(serializers.Serializer):
    prescription_id = serializers.IntegerField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = DispensingItemCreateSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value
