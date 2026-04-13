from django.contrib import admin

from .models import DispensingItem, DispensingRecord, Medicine, StockEntry


class StockEntryInline(admin.TabularInline):
    model = StockEntry
    extra = 0
    readonly_fields = ["entry_type", "quantity_change", "balance_after", "actor", "created_at"]


class DispensingItemInline(admin.TabularInline):
    model = DispensingItem
    extra = 0
    readonly_fields = ["medicine", "drug_name_snapshot", "quantity_dispensed", "unit_price_snapshot"]


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ["name", "clinic", "category", "dosage_form", "current_stock", "reorder_level", "is_active"]
    list_filter = ["clinic", "category", "is_active"]
    search_fields = ["name", "name_ta"]
    inlines = [StockEntryInline]


@admin.register(StockEntry)
class StockEntryAdmin(admin.ModelAdmin):
    list_display = ["medicine", "entry_type", "quantity_change", "balance_after", "actor", "created_at"]
    list_filter = ["medicine__clinic", "entry_type"]
    readonly_fields = ["created_at"]


@admin.register(DispensingRecord)
class DispensingRecordAdmin(admin.ModelAdmin):
    list_display = ["prescription", "clinic", "dispensed_by", "created_at"]
    list_filter = ["clinic"]
    readonly_fields = ["created_at"]
    inlines = [DispensingItemInline]
