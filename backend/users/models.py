from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_CHOICES = [
        ("doctor", "Doctor"),
        ("therapist", "Therapist"),
        ("admin", "Admin"),
    ]

    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="members",
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="doctor")
    is_clinic_owner = models.BooleanField(default=False)

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"


class EmailOTP(models.Model):
    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_locked(self):
        return self.attempts >= 5

    def __str__(self):
        return f"OTP for {self.email} (expires {self.expires_at})"


class PendingSignup(models.Model):
    """Temporary storage for signup data before OTP verification."""

    DISCIPLINE_CHOICES = [
        ("siddha", "Siddha"),
        ("ayurveda", "Ayurveda"),
        ("yoga_naturopathy", "Yoga & Naturopathy"),
        ("unani", "Unani"),
        ("homeopathy", "Homeopathy"),
    ]

    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True, default="")
    discipline = models.CharField(max_length=30, choices=DISCIPLINE_CHOICES)
    otp_code_hash = models.CharField(max_length=64)
    otp_attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_locked(self):
        return self.otp_attempts >= 5

    def __str__(self):
        return f"Pending signup for {self.email}"
