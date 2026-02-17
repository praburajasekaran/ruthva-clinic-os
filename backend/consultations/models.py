from django.db import models


class Consultation(models.Model):
    ASSESSMENT_CHOICES = [("normal", "Normal"), ("abnormal", "Abnormal")]

    patient = models.ForeignKey(
        "patients.Patient", on_delete=models.CASCADE, related_name="consultations"
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

    # Envagai Thervu (8 Diagnostic Tools)
    naa = models.TextField(
        blank=True, default="", help_text="Tongue examination"
    )
    niram = models.TextField(blank=True, default="", help_text="Complexion")
    mozhi = models.TextField(blank=True, default="", help_text="Speech")
    vizhi = models.TextField(blank=True, default="", help_text="Eyes")
    nadi = models.TextField(
        blank=True,
        default="",
        help_text="Pulse - Prakruti, Vikruti, Upadosham",
    )
    mei = models.TextField(
        blank=True, default="", help_text="Touch/Body - heat, cold, normal"
    )
    muthiram = models.TextField(
        blank=True, default="", help_text="Urine - Neerkuri, Neikuri"
    )
    varmam = models.TextField(
        blank=True, default="", help_text="Varmam points assessment"
    )
    mental_state = models.TextField(
        blank=True, default="", help_text="Attitude/mental state observations"
    )

    # Diagnosis
    chief_complaints = models.TextField(blank=True, default="")
    history_of_present_illness = models.TextField(blank=True, default="")
    diagnosis = models.TextField(blank=True, default="")
    icd_code = models.CharField(max_length=20, blank=True, default="")

    consultation_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-consultation_date", "-created_at"]

    def __str__(self):
        return f"Consultation for {self.patient.name} on {self.consultation_date}"
