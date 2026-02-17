from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from consultations.models import Consultation
from patients.models import FamilyHistory, MedicalHistory, Patient
from prescriptions.models import Medication, Prescription, ProcedureEntry


class Command(BaseCommand):
    help = "Create sample data for development"

    def handle(self, *args, **options):
        if Patient.objects.exists():
            self.stdout.write(self.style.WARNING("Data already exists. Skipping."))
            return

        today = timezone.now().date()

        patients_data = [
            {
                "name": "Rajeshwari Devi",
                "age": 45,
                "gender": "female",
                "phone": "9876543210",
                "email": "rajeshwari@example.com",
                "address": "12, Gandhi Nagar, Chennai",
                "blood_group": "B+",
                "occupation": "Teacher",
                "marital_status": "married",
                "food_habits": "vegetarian",
                "activity_level": "moderate",
                "number_of_children": 2,
            },
            {
                "name": "Murugan Kannan",
                "age": 55,
                "gender": "male",
                "phone": "9876543211",
                "address": "45, Anna Nagar, Madurai",
                "blood_group": "O+",
                "occupation": "Farmer",
                "marital_status": "married",
                "food_habits": "non_vegetarian",
                "activity_level": "active",
            },
            {
                "name": "Lakshmi Priya",
                "age": 32,
                "gender": "female",
                "phone": "9876543212",
                "email": "lakshmi.p@example.com",
                "address": "78, Nehru Street, Coimbatore",
                "blood_group": "A+",
                "occupation": "Software Engineer",
                "marital_status": "single",
                "food_habits": "vegetarian",
                "activity_level": "sedentary",
                "menstrual_history": "Regular, 28-day cycle",
            },
            {
                "name": "Karthikeyan Subramani",
                "age": 68,
                "gender": "male",
                "phone": "9876543213",
                "address": "23, Temple Street, Thanjavur",
                "blood_group": "AB+",
                "occupation": "Retired",
                "marital_status": "married",
                "food_habits": "vegetarian",
                "activity_level": "sedentary",
                "allergies": "Penicillin",
            },
            {
                "name": "Meenakshi Sundaram",
                "age": 28,
                "gender": "female",
                "phone": "9876543214",
                "email": "meena.s@example.com",
                "address": "56, Lake Road, Trichy",
                "blood_group": "B-",
                "occupation": "Nurse",
                "marital_status": "married",
                "food_habits": "non_vegetarian",
                "activity_level": "active",
                "number_of_children": 1,
            },
        ]

        for pdata in patients_data:
            patient = Patient.objects.create(**pdata)
            self.stdout.write(f"  Created patient: {patient}")

            # Add medical history for some patients
            if patient.age > 40:
                MedicalHistory.objects.create(
                    patient=patient,
                    disease="Type 2 Diabetes",
                    duration="5 years",
                    medication="Metformin 500mg",
                )
            if patient.age > 60:
                MedicalHistory.objects.create(
                    patient=patient,
                    disease="Hypertension",
                    duration="10 years",
                    medication="Amlodipine 5mg",
                )

            # Add family history
            FamilyHistory.objects.create(
                patient=patient,
                relation="Father",
                disease="Diabetes",
                duration="15 years",
            )

        self.stdout.write(self.style.SUCCESS(f"\nCreated {len(patients_data)} patients"))

        # Create consultations
        patients = Patient.objects.all()
        consultation_count = 0

        for i, patient in enumerate(patients):
            # Each patient gets 2-3 consultations
            for j in range(2 + (i % 2)):
                consult_date = today - timedelta(days=j * 7 + i)
                consultation = Consultation.objects.create(
                    patient=patient,
                    weight=55 + i * 5,
                    height=155 + i * 3,
                    pulse_rate=72 + i,
                    temperature=98.6,
                    bp_systolic=120 + i * 2,
                    bp_diastolic=80 + i,
                    appetite="normal",
                    bowel="normal",
                    micturition="normal",
                    sleep_quality="normal" if i % 2 == 0 else "abnormal",
                    sleep_notes="" if i % 2 == 0 else "Difficulty falling asleep",
                    naa="Normal tongue, no coating" if j == 0 else "Slight white coating",
                    niram="Normal complexion",
                    mozhi="Clear speech",
                    vizhi="Normal, no discoloration",
                    nadi="Vatha-Pitha predominant",
                    mei="Normal body temperature",
                    muthiram="Clear, normal color",
                    varmam="No tender points",
                    chief_complaints="Joint pain and stiffness" if j == 0 else "Follow-up visit",
                    diagnosis="Vatha disorder - Arthritis" if j == 0 else "Improving",
                    consultation_date=consult_date,
                )
                consultation_count += 1

                # Create prescription for the first consultation of each patient
                if j == 0:
                    prescription = Prescription.objects.create(
                        consultation=consultation,
                        diet_advice="Avoid cold foods, consume warm soups and rasam",
                        diet_advice_ta="\u0b95\u0bc1\u0bb3\u0bbf\u0bb0\u0bcd\u0b9a\u0bcd\u0b9a\u0bbf\u0baf\u0bbe\u0ba9 \u0b89\u0ba3\u0bb5\u0bc1\u0b95\u0bb3\u0bc8 \u0ba4\u0bb5\u0bbf\u0bb0\u0bcd\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd, \u0b9a\u0bc2\u0b9f\u0bbe\u0ba9 \u0b9a\u0bc2\u0baa\u0bcd \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0bb0\u0b9a\u0bae\u0bcd \u0b9a\u0bbe\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0bb5\u0bc1\u0bae\u0bcd",
                        lifestyle_advice="Apply warm sesame oil before bath",
                        lifestyle_advice_ta="\u0b95\u0bc1\u0bb3\u0bbf\u0baa\u0bcd\u0baa\u0ba4\u0bb1\u0bcd\u0b95\u0bc1 \u0bae\u0bc1\u0ba9\u0bcd \u0bb5\u0bc6\u0ba4\u0bc1\u0bb5\u0bc6\u0ba4\u0bc1\u0baa\u0bcd\u0baa\u0bbe\u0ba9 \u0ba8\u0bb2\u0bcd\u0bb2\u0bc6\u0ba3\u0bcd\u0ba3\u0bc6\u0baf\u0bcd \u0ba4\u0b9f\u0bb5\u0bb5\u0bc1\u0bae\u0bcd",
                        exercise_advice="Gentle yoga, 15 minutes daily",
                        exercise_advice_ta="\u0b8e\u0bb3\u0bbf\u0baf \u0baf\u0bcb\u0b95\u0bbe, \u0ba4\u0bbf\u0ba9\u0bae\u0bc1\u0bae\u0bcd 15 \u0ba8\u0bbf\u0bae\u0bbf\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bcd",
                        follow_up_date=today + timedelta(days=7),
                        follow_up_notes="Review joint mobility",
                        follow_up_notes_ta="\u0bae\u0bc2\u0b9f\u0bcd\u0b9f\u0bc1 \u0b87\u0baf\u0b95\u0bcd\u0b95\u0ba4\u0bcd\u0ba4\u0bc8 \u0b86\u0baf\u0bcd\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0bb5\u0bc1\u0bae\u0bcd",
                    )

                    Medication.objects.create(
                        prescription=prescription,
                        drug_name="Amukkirai Chooranam",
                        dosage="5g",
                        frequency="BD",
                        frequency_tamil="\u0b95\u0bbe\u0bb2\u0bc8-\u0bae\u0bbe\u0bb2\u0bc8",
                        duration="30 days",
                        instructions="Mix with warm water, take before food",
                        instructions_ta="\u0bb5\u0bc6\u0ba8\u0bcd\u0ba8\u0bc0\u0bb0\u0bbf\u0bb2\u0bcd \u0b95\u0bb2\u0ba8\u0bcd\u0ba4\u0bc1 \u0b9a\u0bbe\u0baa\u0bcd\u0baa\u0bbe\u0b9f\u0bcd\u0b9f\u0bbf\u0bb1\u0bcd\u0b95\u0bc1 \u0bae\u0bc1\u0ba9\u0bcd \u0b9a\u0bbe\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0bb5\u0bc1\u0bae\u0bcd",
                        sort_order=1,
                    )
                    Medication.objects.create(
                        prescription=prescription,
                        drug_name="Nilavembu Kudineer",
                        dosage="60ml",
                        frequency="BD",
                        frequency_tamil="\u0b95\u0bbe\u0bb2\u0bc8-\u0bae\u0bbe\u0bb2\u0bc8",
                        duration="15 days",
                        instructions="Take on empty stomach",
                        instructions_ta="\u0bb5\u0bc6\u0bb1\u0bc1\u0bae\u0bcd \u0bb5\u0baf\u0bbf\u0bb1\u0bcd\u0bb1\u0bbf\u0bb2\u0bcd \u0b9a\u0bbe\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0bb5\u0bc1\u0bae\u0bcd",
                        sort_order=2,
                    )
                    Medication.objects.create(
                        prescription=prescription,
                        drug_name="Kottamchukkadi Thailam",
                        dosage="External",
                        frequency="OD",
                        frequency_tamil="\u0b92\u0bb0\u0bc1 \u0bae\u0bc1\u0bb1\u0bc8",
                        duration="30 days",
                        instructions="Apply on affected joints before bath",
                        instructions_ta="\u0baa\u0bbe\u0ba4\u0bbf\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0bae\u0bc2\u0b9f\u0bcd\u0b9f\u0bc1\u0b95\u0bb3\u0bbf\u0bb2\u0bcd \u0b95\u0bc1\u0bb3\u0bbf\u0baa\u0bcd\u0baa\u0ba4\u0bb1\u0bcd\u0b95\u0bc1 \u0bae\u0bc1\u0ba9\u0bcd \u0ba4\u0b9f\u0bb5\u0bb5\u0bc1\u0bae\u0bcd",
                        sort_order=3,
                    )

                    ProcedureEntry.objects.create(
                        prescription=prescription,
                        name="Thokkanam (Massage therapy)",
                        details="Full body oil massage with medicated oil",
                        duration="45 minutes, twice weekly",
                    )

        self.stdout.write(
            self.style.SUCCESS(f"Created {consultation_count} consultations with prescriptions")
        )
