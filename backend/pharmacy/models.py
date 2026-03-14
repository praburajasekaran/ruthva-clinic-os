from django.conf import settings
from django.db import models


class Medicine(models.Model):
    CATEGORY_CHOICES = [
        # Ayurveda / Siddha categories
        ("kashayam",  "Kashayam / \u0b95\u0bb7\u0bbe\u0baf\u0bae\u0bcd"),
        ("choornam",  "Choornam / \u0b9a\u0bc2\u0bb0\u0ba3\u0bae\u0bcd"),
        ("lehyam",    "Lehyam / \u0bb2\u0bc7\u0b95\u0bbf\u0baf\u0bae\u0bcd"),
        ("tailam",    "Tailam / \u0ba4\u0bc8\u0bb2\u0bae\u0bcd"),
        ("arishtam",  "Arishtam / \u0b85\u0bb0\u0bbf\u0bb7\u0bcd\u0b9f\u0bae\u0bcd"),
        ("asavam",    "Asavam / \u0b86\u0b9a\u0bb5\u0bae\u0bcd"),
        ("gulika",    "Gulika / \u0b95\u0bc1\u0bb3\u0bbf\u0b95\u0bc8"),
        ("parpam",    "Parpam / \u0baa\u0bb1\u0bcd\u0baa\u0bae\u0bcd"),
        ("chenduram", "Chenduram / \u0b9a\u0bc6\u0ba8\u0bcd\u0ba4\u0bc2\u0bb0\u0bae\u0bcd"),
        ("nei",       "Nei / \u0ba8\u0bc6\u0baf\u0bcd"),
        # Generic
        ("tablet",    "Tablet"),
        ("capsule",   "Capsule"),
        ("syrup",     "Syrup"),
        ("external",  "External Application"),
        ("other",     "Other"),
        # Homeopathic categories
        ("mother_tincture", "Mother Tincture (Q)"),
        ("trituration",     "Trituration (3X / 6X)"),
        ("centesimal",      "Centesimal Potency (C)"),
        ("lm_potency",      "LM Potency"),
        ("biochemic",       "Biochemic Tissue Salt"),
    ]

    DOSAGE_FORM_CHOICES = [
        ("ml",      "Millilitres (ml)"),
        ("g",       "Grams (g)"),
        ("tablets", "Tablets"),
        ("capsules","Capsules"),
        ("drops",   "Drops"),
        ("pinch",   "Pinch / \u0b9a\u0bbf\u0b9f\u0bcd\u0b9f\u0bbf\u0b95\u0bc8"),
        ("spoon",   "Spoon / \u0b95\u0bb0\u0ba3\u0bcd\u0b9f\u0bbf"),
        ("pellets", "Pellets / Globules"),
        ("other",   "Other"),
    ]

    clinic = models.ForeignKey(
        "clinics.Clinic", on_delete=models.CASCADE, related_name="medicines"
    )
    name = models.CharField(max_length=255)
    name_ta = models.CharField(max_length=255, blank=True, default="")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    dosage_form = models.CharField(max_length=20, choices=DOSAGE_FORM_CHOICES)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_stock = models.IntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["clinic", "name"], name="med_clinic_name"),
            models.Index(fields=["clinic", "category"], name="med_clinic_category"),
            models.Index(fields=["clinic", "is_active"], name="med_clinic_active"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "name"],
                name="unique_medicine_name_per_clinic",
            ),
            models.CheckConstraint(
                check=models.Q(current_stock__gte=0),
                name="medicine_stock_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class StockEntry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ("purchase", "Purchase"),
        ("adjustment", "Manual Adjustment"),
        ("dispense", "Dispensed"),
    ]

    medicine = models.ForeignKey(
        Medicine, on_delete=models.CASCADE, related_name="stock_entries"
    )
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    quantity_change = models.IntegerField()
    balance_after = models.IntegerField()
    notes = models.TextField(blank=True, default="")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stock_entries"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["medicine", "-created_at"], name="stock_med_created"),
        ]
        verbose_name_plural = "Stock entries"

    def __str__(self):
        return f"{self.get_entry_type_display()} {self.quantity_change:+d} \u2192 {self.medicine.name}"


class DispensingRecord(models.Model):
    clinic = models.ForeignKey(
        "clinics.Clinic", on_delete=models.CASCADE, related_name="dispensing_records"
    )
    prescription = models.ForeignKey(
        "prescriptions.Prescription",
        on_delete=models.CASCADE,
        related_name="dispensing_records",
    )
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dispensing_records",
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["clinic", "-created_at"], name="disp_clinic_created"
            ),
            models.Index(fields=["prescription"], name="disp_prescription"),
        ]

    def __str__(self):
        return f"Dispensing for Rx #{self.prescription_id} on {self.created_at:%Y-%m-%d}"


class DispensingItem(models.Model):
    dispensing_record = models.ForeignKey(
        DispensingRecord, on_delete=models.CASCADE, related_name="items"
    )
    medicine = models.ForeignKey(
        Medicine, on_delete=models.PROTECT, related_name="dispensing_items"
    )
    drug_name_snapshot = models.CharField(max_length=255)
    quantity_dispensed = models.PositiveIntegerField()
    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.drug_name_snapshot} x{self.quantity_dispensed}"
