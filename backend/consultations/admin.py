from django.contrib import admin

from .models import Consultation


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ["patient", "clinic", "consultation_date", "diagnosis", "created_at"]
    list_filter = ["patient__clinic", "consultation_date"]

    @admin.display(description="Clinic")
    def clinic(self, obj):
        return obj.patient.clinic if obj.patient else None
    search_fields = ["patient__name", "patient__record_id", "diagnosis"]
    date_hierarchy = "consultation_date"
    fieldsets = [
        ("Patient", {"fields": ["patient", "consultation_date"]}),
        ("Vitals", {"fields": [
            "weight", "height", "pulse_rate", "temperature",
            "bp_systolic", "bp_diastolic",
        ]}),
        ("General Assessment", {"fields": [
            "appetite", "appetite_notes", "bowel", "bowel_notes",
            "micturition", "micturition_notes", "sleep_quality", "sleep_notes",
            "mental_state",
        ]}),
        ("Diagnostic Data", {"fields": ["diagnostic_data"]}),
        ("Diagnosis", {"fields": [
            "chief_complaints", "history_of_present_illness",
            "diagnosis",
        ]}),
    ]
