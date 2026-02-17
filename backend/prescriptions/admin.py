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
    list_display = ["consultation", "follow_up_date", "created_at"]
    list_filter = ["follow_up_date", "created_at"]
    search_fields = [
        "consultation__patient__name",
        "consultation__patient__record_id",
    ]
    inlines = [MedicationInline, ProcedureEntryInline]
