from django.db import models


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
