from django.db import models


class Medicine(models.Model):
    CATEGORY_CHOICES = [
        # Ayurveda / Siddha categories
        ("kashayam",  "Kashayam / கஷாயம்"),
        ("choornam",  "Choornam / சூரணம்"),
        ("lehyam",    "Lehyam / லேகியம்"),
        ("tailam",    "Tailam / தைலம்"),
        ("arishtam",  "Arishtam / அரிஷ்டம்"),
        ("asavam",    "Asavam / ஆசவம்"),
        ("gulika",    "Gulika / குளிகை"),
        ("parpam",    "Parpam / பற்பம்"),
        ("chenduram", "Chenduram / செந்தூரம்"),
        ("nei",       "Nei / நெய்"),
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
        ("pinch",   "Pinch / சிட்டிகை"),
        ("spoon",   "Spoon / கரண்டி"),
        ("pellets", "Pellets / Globules"),
        ("other",   "Other"),
    ]

    clinic       = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="medicines",
    )
    name         = models.CharField(max_length=255)
    name_ta      = models.CharField(max_length=255, blank=True, default="")
    category     = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    dosage_form  = models.CharField(max_length=20, choices=DOSAGE_FORM_CHOICES)
    unit_price   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_stock= models.IntegerField(default=0)
    reorder_level= models.PositiveIntegerField(default=10)
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "name"], name="unique_medicine_name_per_clinic"
            ),
            models.CheckConstraint(
                check=models.Q(current_stock__gte=0),
                name="medicine_stock_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
