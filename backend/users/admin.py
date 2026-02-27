from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "first_name", "last_name", "clinic", "role", "is_clinic_owner"]
    list_filter = ["role", "is_clinic_owner", "clinic"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Clinic", {"fields": ("clinic", "role", "is_clinic_owner")}),
    )
