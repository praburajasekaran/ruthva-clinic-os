from django.conf import settings
from django.db import models


class Consultation(models.Model):
    ASSESSMENT_CHOICES = [("normal", "Normal"), ("abnormal", "Abnormal")]

    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="consultations",
    )
    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="consultations"
    )
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultations",
    )

    # Vitals
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    height = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    pulse_rate = models.PositiveSmallIntegerField(null=True, blank=True)
    temperature = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )
    bp_systolic = models.PositiveSmallIntegerField(null=True, blank=True)
    bp_diastolic = models.PositiveSmallIntegerField(null=True, blank=True)

    # General Assessment
    appetite = models.CharField(
        max_length=10, blank=True, default="", choices=ASSESSMENT_CHOICES
    )
    appetite_notes = models.TextField(blank=True, default="")
    bowel = models.CharField(
        max_length=10, blank=True, default="", choices=ASSESSMENT_CHOICES
    )
    bowel_notes = models.TextField(blank=True, default="")
    micturition = models.CharField(
        max_length=10, blank=True, default="", choices=ASSESSMENT_CHOICES
    )
    micturition_notes = models.TextField(blank=True, default="")
    sleep_quality = models.CharField(
        max_length=10, blank=True, default="", choices=ASSESSMENT_CHOICES
    )
    sleep_notes = models.TextField(blank=True, default="")
    mental_state = models.TextField(
        blank=True, default="", help_text="Attitude/mental state observations"
    )

    # Discipline-specific diagnostics (replaces legacy Envagai Thervu columns)
    diagnostic_data = models.JSONField(default=dict, blank=True)

    # Diagnosis
    chief_complaints = models.TextField(blank=True, default="")
    history_of_present_illness = models.TextField(blank=True, default="")
    diagnosis = models.TextField(blank=True, default="")

    consultation_date = models.DateField()
    is_imported = models.BooleanField(
        default=False,
        help_text="True if created via CSV import (baseline record)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-consultation_date", "-created_at"]
        indexes = [
            models.Index(fields=["clinic", "-consultation_date"], name="consult_clinic_date"),
            models.Index(fields=["clinic", "patient", "-consultation_date"], name="consult_clinic_pat_date"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "patient", "consultation_date"],
                name="unique_consultation_per_patient_day",
            ),
        ]

    def __str__(self):
        return f"Consultation for {self.patient.name} on {self.consultation_date}"
