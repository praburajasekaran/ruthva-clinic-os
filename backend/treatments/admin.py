from django.contrib import admin

from .models import (
    DoctorActionTask,
    SessionFeedback,
    TreatmentBlock,
    TreatmentPlan,
    TreatmentSession,
)


class TreatmentSessionInline(admin.TabularInline):
    model = TreatmentSession
    extra = 0


@admin.register(TreatmentPlan)
class TreatmentPlanAdmin(admin.ModelAdmin):
    list_display = ["id", "clinic", "prescription", "status", "total_days", "created_at"]
    list_filter = ["status", "clinic"]
    search_fields = ["prescription__consultation__patient__name", "prescription__consultation__patient__record_id"]


@admin.register(TreatmentBlock)
class TreatmentBlockAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "treatment_plan",
        "block_number",
        "start_day_number",
        "end_day_number",
        "status",
        "replan_required",
    ]
    list_filter = ["status", "replan_required"]
    inlines = [TreatmentSessionInline]


@admin.register(TreatmentSession)
class TreatmentSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "treatment_block", "day_number", "session_date", "procedure_name", "execution_status"]
    list_filter = ["execution_status", "medium_type"]
    search_fields = ["procedure_name", "medium_name"]


@admin.register(SessionFeedback)
class SessionFeedbackAdmin(admin.ModelAdmin):
    list_display = ["id", "treatment_session", "therapist", "completion_status", "response_score", "review_requested", "created_at"]
    list_filter = ["completion_status", "review_requested"]
    search_fields = ["treatment_session__procedure_name", "therapist__username"]


@admin.register(DoctorActionTask)
class DoctorActionTaskAdmin(admin.ModelAdmin):
    list_display = ["id", "clinic", "treatment_block", "task_type", "status", "assigned_doctor", "due_date"]
    list_filter = ["task_type", "status", "clinic"]
    search_fields = ["treatment_plan__prescription__consultation__patient__name"]
