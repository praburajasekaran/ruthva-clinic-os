from django.contrib import admin

from .models import Clinic, ClinicInvitation


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ["name", "subdomain", "discipline", "is_active", "created_at"]
    list_filter = ["discipline", "is_active"]
    search_fields = ["name", "subdomain"]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.email:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            # Auto-generate username from email local part + clinic subdomain
            base_username = f"{obj.email.split('@')[0].replace('+', '_')}.{obj.subdomain}"
            username = base_username[:150]
            user, created = User.objects.get_or_create(
                email=obj.email,
                defaults={
                    "username": username,
                    "clinic": obj,
                    "is_clinic_owner": True,
                    "is_active": True,
                },
            )
            if not created and user.clinic_id != obj.pk:
                user.clinic = obj
                user.is_clinic_owner = True
                user.save(update_fields=["clinic", "is_clinic_owner"])


@admin.register(ClinicInvitation)
class ClinicInvitationAdmin(admin.ModelAdmin):
    list_display = ["email", "clinic", "role", "created_at", "accepted_at"]
    list_filter = ["role", "accepted_at"]
    search_fields = ["email", "clinic__name"]
    readonly_fields = ["token"]
