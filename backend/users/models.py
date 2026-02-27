from django.contrib.auth.models import AbstractUser
from django.db import models


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
