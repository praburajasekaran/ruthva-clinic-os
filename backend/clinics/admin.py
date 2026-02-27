from django.contrib import admin

from .models import Clinic


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ["name", "subdomain", "discipline", "is_active", "created_at"]
    list_filter = ["discipline", "is_active"]
    search_fields = ["name", "subdomain"]
