from django.contrib import admin

from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "clinic", "user", "created_at")
    list_filter = ("clinic", "category", "status")
    search_fields = ("title", "description")
    readonly_fields = ("created_at",)
