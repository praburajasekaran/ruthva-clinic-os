from django.db import models


class Prescription(models.Model):
    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="prescriptions",
    )
    consultation = models.OneToOneField(
        "consultations.Consultation",
        on_delete=models.CASCADE,
        related_name="prescription",
    )
    diet_advice = models.TextField(blank=True, default="")
    diet_advice_ta = models.TextField(blank=True, default="")
    lifestyle_advice = models.TextField(blank=True, default="")
    lifestyle_advice_ta = models.TextField(blank=True, default="")
    exercise_advice = models.TextField(blank=True, default="")
    exercise_advice_ta = models.TextField(blank=True, default="")
    follow_up_date = models.DateField(null=True, blank=True)
    follow_up_notes = models.TextField(blank=True, default="")
    follow_up_notes_ta = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["clinic", "-created_at"], name="rx_clinic_created"),
            models.Index(fields=["clinic", "follow_up_date"], name="rx_clinic_followup"),
        ]

    def __str__(self):
        return (
            f"Rx for {self.consultation.patient.name} "
            f"on {self.consultation.consultation_date}"
        )


class Medication(models.Model):
    DILUTION_SCALE_CHOICES = [
        ("C",  "Centesimal (C)"),
        ("X",  "Decimal (X)"),
        ("LM", "LM Potency"),
        ("Q",  "Mother Tincture (Q)"),
    ]

    FREQUENCY_CHOICES = [
        ("OD", "Once daily / ஒரு முறை"),
        ("BD", "Twice daily / காலை-மாலை"),
        ("TDS", "Thrice daily / மூன்று முறை"),
        ("QID", "Four times daily / நான்கு முறை"),
        ("SOS", "As needed / தேவைப்படும்போது"),
        ("HS", "At bedtime / இரவு"),
    ]

    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name="medications"
    )
    medicine = models.ForeignKey(
        "pharmacy.Medicine",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medication_usages",
    )
    drug_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100, blank=True, default="")
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, blank=True, default="")
    frequency_tamil = models.CharField(max_length=100, blank=True, default="")
    timing = models.CharField(max_length=50, blank=True, default="")
    timing_tamil = models.CharField(max_length=100, blank=True, default="")
    duration = models.CharField(max_length=100, blank=True, default="")
    instructions = models.TextField(blank=True, default="")
    instructions_ta = models.TextField(blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)
    # Homeopathy-specific fields (blank/null for all other disciplines)
    potency = models.CharField(max_length=20, blank=True, default="")
    dilution_scale = models.CharField(
        max_length=5, choices=DILUTION_SCALE_CHOICES, blank=True, default=""
    )
    pellet_count = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.drug_name} - {self.dosage}"


class RemedyFollowUpResponse(models.Model):
    RESPONSE_TYPE_CHOICES = [
        ("amelioration",           "Amelioration"),
        ("aggravation",            "Aggravation"),
        ("partial_response",       "Partial Response"),
        ("no_change",              "No Change"),
        ("return_of_old_symptoms", "Return of Old Symptoms"),
        ("new_symptoms",           "New Symptoms"),
    ]
    ACTION_TAKEN_CHOICES = [
        ("continue_same",    "Continue Same Remedy & Potency"),
        ("increase_potency", "Increase Potency"),
        ("decrease_potency", "Decrease Potency"),
        ("change_remedy",    "Change Remedy"),
        ("wait_and_watch",   "Wait and Watch"),
        ("antidote",         "Antidote"),
    ]

    clinic                = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="remedy_followup_responses",
    )
    prescription          = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name="remedy_followup_responses",
    )
    previous_prescription = models.ForeignKey(
        Prescription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="next_followup_responses",
    )
    remedy_evaluated      = models.ForeignKey(
        Medication,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="followup_responses",
    )
    response_type         = models.CharField(max_length=30, choices=RESPONSE_TYPE_CHOICES)
    action_taken          = models.CharField(max_length=20, choices=ACTION_TAKEN_CHOICES)
    new_potency           = models.CharField(max_length=20, blank=True, default="")
    notes                 = models.TextField(blank=True, default="")
    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["clinic", "-created_at"], name="remedy_followup_clinic_date"
            ),
            models.Index(
                fields=["prescription"], name="remedy_followup_prescription"
            ),
        ]

    def __str__(self):
        return (
            f"RemedyFollowUp for Rx#{self.prescription_id} "
            f"— {self.response_type}"
        )


class ProcedureEntry(models.Model):
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name="procedures"
    )
    name = models.CharField(max_length=255)
    details = models.TextField(blank=True, default="")
    duration = models.CharField(max_length=100, blank=True, default="")
    follow_up_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "Procedure entries"

    def __str__(self):
        return self.name
