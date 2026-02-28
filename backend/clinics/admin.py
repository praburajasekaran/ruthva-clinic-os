from django.contrib import admin

from .models import Clinic, ClinicInvitation


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ["name", "subdomain", "discipline", "is_active", "created_at"]
    list_filter = ["discipline", "is_active"]
    search_fields = ["name", "subdomain"]


@admin.register(ClinicInvitation)
class ClinicInvitationAdmin(admin.ModelAdmin):
    list_display = ["email", "clinic", "role", "created_at", "accepted_at"]
    list_filter = ["role", "accepted_at"]
    search_fields = ["email", "clinic__name"]
    readonly_fields = ["token"]
