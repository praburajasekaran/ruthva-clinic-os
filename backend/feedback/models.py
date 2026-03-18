from django.conf import settings
from django.db import models


class Feedback(models.Model):
    class Category(models.TextChoices):
        BUG = "bug", "Bug Report"
        FEATURE = "feature", "Feature Request"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SYNCED = "synced", "Synced to GitHub"
        FAILED = "failed", "GitHub Sync Failed"

    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="feedback",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="feedback",
    )
    category = models.CharField(max_length=10, choices=Category.choices)
    title = models.CharField(max_length=256)
    description = models.TextField(blank=True, default="")
    screenshot_url = models.URLField(blank=True, default="")
    page_url = models.URLField(blank=True, default="")
    user_role = models.CharField(max_length=20, blank=True, default="")
    browser_info = models.CharField(max_length=256, blank=True, default="")
    github_issue_url = models.URLField(blank=True, default="")
    github_issue_number = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.category}] {self.title}"
