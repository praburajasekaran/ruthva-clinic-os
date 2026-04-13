from django.contrib import admin

from .models import Medication, Prescription, ProcedureEntry


class MedicationInline(admin.TabularInline):
    model = Medication
    extra = 1


class ProcedureEntryInline(admin.TabularInline):
    model = ProcedureEntry
    extra = 1


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ["consultation", "clinic", "follow_up_date", "created_at"]
    list_filter = ["consultation__patient__clinic", "follow_up_date", "created_at"]

    @admin.display(description="Clinic")
    def clinic(self, obj):
        return obj.consultation.patient.clinic if obj.consultation and obj.consultation.patient else None
    search_fields = [
        "consultation__patient__name",
        "consultation__patient__record_id",
    ]
    inlines = [MedicationInline, ProcedureEntryInline]
