from django.db import models


class RuthvaJourneyRef(models.Model):
    """
    Tracks Ruthva treatment journeys linked to Sivanethram consultations.
    One row per patient-journey, referenced by Ruthva's journey ID.
    """

    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_DROPPED = "dropped"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_DROPPED, "Dropped"),
    ]

    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="ruthva_journeys",
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="ruthva_journeys",
    )
    consultation = models.ForeignKey(
        "consultations.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ruthva_journeys",
    )
    ruthva_journey_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Journey ID returned by Ruthva API",
    )
    ruthva_patient_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Patient ID in Ruthva",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    risk_level = models.CharField(max_length=20, blank=True, default="stable")
    risk_reason = models.CharField(max_length=255, blank=True, default="")
    start_date = models.DateField(null=True, blank=True)
    next_visit_date = models.DateField(null=True, blank=True)
    last_visit_date = models.DateField(null=True, blank=True)
    missed_visits = models.PositiveSmallIntegerField(default=0)
    duration_days = models.PositiveSmallIntegerField(default=0)
    followup_interval_days = models.PositiveSmallIntegerField(default=0)
    consent_given_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When patient consent was captured",
    )
    last_synced_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last successful webhook or poll update from Ruthva",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["clinic", "patient", "status"],
                name="ruthva_ref_clinic_pat_status",
            ),
            models.Index(
                fields=["clinic", "status", "-created_at"],
                name="ruthva_ref_clinic_status_date",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "patient"],
                condition=models.Q(status="active"),
                name="unique_active_journey_per_patient",
            ),
        ]

    def __str__(self):
        return f"Ruthva journey {self.ruthva_journey_id} for {self.patient} ({self.status})"
