from django.contrib import admin

from .models import Medicine


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "dosage_form", "current_stock", "is_active"]
    list_filter = ["category", "dosage_form", "is_active"]
    search_fields = ["name", "name_ta"]
