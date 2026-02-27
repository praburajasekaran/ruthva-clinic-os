from django.contrib import admin

from .models import SentReminder


@admin.register(SentReminder)
class SentReminderAdmin(admin.ModelAdmin):
    list_display = [
        "reminder_type",
        "patient_email",
        "follow_up_date",
        "sent_at",
        "resend_email_id",
    ]
    list_filter = ["reminder_type", "follow_up_date"]
    search_fields = ["patient_email", "resend_email_id"]
    readonly_fields = [
        "reminder_type",
        "object_id",
        "follow_up_date",
        "patient_email",
        "sent_at",
        "resend_email_id",
    ]
