from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class Patient(models.Model):
    GENDER_CHOICES = [("male", "Male"), ("female", "Female"), ("other", "Other")]
    BLOOD_GROUP_CHOICES = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
    ]
    FOOD_HABITS_CHOICES = [
        ("vegetarian", "Vegetarian"),
        ("non_vegetarian", "Non-Vegetarian"),
        ("vegan", "Vegan"),
    ]
    ACTIVITY_LEVEL_CHOICES = [
        ("sedentary", "Sedentary"),
        ("moderate", "Moderate"),
        ("active", "Active"),
    ]
    MARITAL_STATUS_CHOICES = [
        ("single", "Single"),
        ("married", "Married"),
        ("widowed", "Widowed"),
        ("divorced", "Divorced"),
    ]

    clinic = models.ForeignKey(
        "clinics.Clinic",
        on_delete=models.CASCADE,
        related_name="patients",
    )
    record_id = models.CharField(max_length=20, editable=False)
    name = models.CharField(max_length=255)
    age = models.PositiveSmallIntegerField()
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=15)
    whatsapp_number = models.CharField(max_length=15, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    blood_group = models.CharField(
        max_length=5, blank=True, default="", choices=BLOOD_GROUP_CHOICES
    )
    occupation = models.CharField(max_length=100, blank=True, default="")
    marital_status = models.CharField(
        max_length=20, blank=True, default="", choices=MARITAL_STATUS_CHOICES
    )
    referred_by = models.CharField(max_length=255, blank=True, default="")
    allergies = models.TextField(blank=True, default="")
    food_habits = models.CharField(
        max_length=20, blank=True, default="", choices=FOOD_HABITS_CHOICES
    )
    activity_level = models.CharField(
        max_length=20, blank=True, default="", choices=ACTIVITY_LEVEL_CHOICES
    )
    menstrual_history = models.TextField(blank=True, default="")
    number_of_children = models.PositiveSmallIntegerField(null=True, blank=True)
    vaccination_records = models.TextField(blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["clinic", "-created_at"], name="patient_clinic_created"),
            models.Index(fields=["clinic", "phone"], name="patient_clinic_phone"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["clinic", "record_id"],
                name="unique_record_id_per_clinic",
            ),
        ]

    @property
    def calculated_age(self):
        if self.date_of_birth:
            today = timezone.now().date()
            dob = self.date_of_birth
            return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return self.age

    @property
    def calculated_age(self):
        if self.date_of_birth:
            today = timezone.now().date()
            dob = self.date_of_birth
            return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return self.age

    def save(self, *args, **kwargs):
        if not self.record_id:
            with transaction.atomic():
                year = timezone.now().year
                from clinics.models import Clinic
                Clinic.objects.select_for_update().get(pk=self.clinic_id)

                last = (
                    Patient.objects.filter(
                        clinic=self.clinic,
                        record_id__startswith=f"PAT-{year}-",
                    )
                    .order_by("-record_id")
                    .first()
                )
                if last:
                    last_num = int(last.record_id.split("-")[-1])
                    self.record_id = f"PAT-{year}-{last_num + 1:04d}"
                else:
                    self.record_id = f"PAT-{year}-0001"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.record_id})"


class MedicalHistory(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="medical_history"
    )
    disease = models.CharField(max_length=255)
    duration = models.CharField(max_length=100)
    medication = models.TextField(blank=True, default="")

    class Meta:
        verbose_name_plural = "Medical histories"

    def __str__(self):
        return f"{self.disease} - {self.patient.name}"


class FamilyHistory(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="family_history"
    )
    relation = models.CharField(max_length=100)
    disease = models.CharField(max_length=255)
    duration = models.CharField(max_length=100, blank=True, default="")
    remarks = models.TextField(blank=True, default="")

    class Meta:
        verbose_name_plural = "Family histories"

    def __str__(self):
        return f"{self.relation}: {self.disease} - {self.patient.name}"
