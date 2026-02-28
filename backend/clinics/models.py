import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class Clinic(models.Model):
    DISCIPLINE_CHOICES = [
        ("siddha", "Siddha"),
        ("ayurveda", "Ayurveda"),
        ("yoga_naturopathy", "Yoga & Naturopathy"),
        ("unani", "Unani"),
        ("homeopathy", "Homeopathy"),
    ]
    PAPER_SIZE_CHOICES = [
        ("A4", "A4"),
        ("A5", "A5"),
    ]

    name = models.CharField(max_length=255)
    subdomain = models.SlugField(max_length=63, unique=True)
    discipline = models.CharField(max_length=20, choices=DISCIPLINE_CHOICES)
    address = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    logo_url = models.URLField(blank=True, default="")
    paper_size = models.CharField(
        max_length=5, choices=PAPER_SIZE_CHOICES, default="A4"
    )
    primary_color = models.CharField(max_length=7, default="#2c5f2d")
    tagline = models.CharField(max_length=255, blank=True, default="")
    active_patient_limit = models.PositiveIntegerField(default=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_discipline_display()})"


class ClinicInvitation(models.Model):
    INVITE_EXPIRY_DAYS = 7

    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=[
        ("doctor", "Doctor"),
        ("therapist", "Therapist"),
        ("admin", "Admin"),
    ])
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True, default="")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invitations"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "email"],
                condition=models.Q(accepted_at__isnull=True),
                name="unique_pending_invite_per_email",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=self.INVITE_EXPIRY_DAYS)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_pending(self):
        return self.accepted_at is None and not self.is_expired

    def __str__(self):
        return f"Invite {self.email} → {self.clinic.name} ({self.get_role_display()})"
