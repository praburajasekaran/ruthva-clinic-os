from django.db import models


class Prescription(models.Model):
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

    def __str__(self):
        return (
            f"Rx for {self.consultation.patient.name} "
            f"on {self.consultation.consultation_date}"
        )


class Medication(models.Model):
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
    drug_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    frequency_tamil = models.CharField(max_length=100, blank=True, default="")
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True, default="")
    instructions_ta = models.TextField(blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.drug_name} - {self.dosage}"


class ProcedureEntry(models.Model):
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name="procedures"
    )
    name = models.CharField(max_length=255)
    details = models.TextField(blank=True, default="")
    duration = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        verbose_name_plural = "Procedure entries"

    def __str__(self):
        return self.name
