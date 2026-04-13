from django.contrib import admin

from .models import FamilyHistory, MedicalHistory, Patient


class MedicalHistoryInline(admin.TabularInline):
    model = MedicalHistory
    extra = 1


class FamilyHistoryInline(admin.TabularInline):
    model = FamilyHistory
    extra = 1


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["record_id", "name", "clinic", "age", "gender", "phone", "created_at"]
    list_filter = ["clinic", "gender", "blood_group", "created_at"]
    search_fields = ["name", "phone", "record_id"]
    readonly_fields = ["record_id", "created_at", "updated_at"]
    inlines = [MedicalHistoryInline, FamilyHistoryInline]
