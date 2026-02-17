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

        # Patient 1: Rajan Kumar
        p1 = Patient.objects.create(
            name="Rajan Kumar",
            age=45,
            gender="male",
            phone="9876543210",
            blood_group="B+",
            occupation="Teacher",
            marital_status="married",
            food_habits="vegetarian",
            activity_level="moderate",
            allergies="Dust allergy",
        )
        MedicalHistory.objects.create(
            patient=p1, disease="Diabetes", duration="5 years", medication="Metformin"
        )
        FamilyHistory.objects.create(
            patient=p1, relation="Father", disease="Hypertension", duration="10 years"
        )

        # Patient 2: Priya Sundaram
        p2 = Patient.objects.create(
            name="Priya Sundaram",
            age=32,
            gender="female",
            phone="9123456789",
            blood_group="O+",
            occupation="Software Engineer",
            marital_status="married",
            food_habits="non_vegetarian",
            activity_level="sedentary",
            number_of_children=1,
        )

        # Patient 3: Murugan V
        p3 = Patient.objects.create(
            name="Murugan V",
            age=58,
            gender="male",
            phone="9445678901",
            blood_group="A+",
            occupation="Farmer",
            marital_status="married",
            food_habits="vegetarian",
            activity_level="active",
        )
        MedicalHistory.objects.create(
            patient=p3,
            disease="Arthritis",
            duration="3 years",
            medication="Ayurvedic oil",
        )

        # Patient 4: Lakshmi R
        p4 = Patient.objects.create(
            name="Lakshmi R",
            age=28,
            gender="female",
            phone="9556789012",
            occupation="Homemaker",
            marital_status="married",
            food_habits="vegetarian",
            activity_level="moderate",
            number_of_children=2,
            menstrual_history="Regular, 28-day cycle",
        )

        # Patient 5: Anand S
        p5 = Patient.objects.create(
            name="Anand S",
            age=40,
            gender="male",
            phone="9667890123",
            blood_group="AB+",
            occupation="Business",
            marital_status="single",
            food_habits="non_vegetarian",
            activity_level="sedentary",
            allergies="Penicillin",
        )

        # Consultations for Patient 1
        c1 = Consultation.objects.create(
            patient=p1,
            consultation_date=today - timedelta(days=7),
            weight=72,
            height=170,
            pulse_rate=78,
            temperature=98.4,
            bp_systolic=130,
            bp_diastolic=85,
            appetite="normal",
            bowel="normal",
            micturition="normal",
            sleep_quality="abnormal",
            sleep_notes="Disturbed sleep, wakes up 2-3 times",
            naa="Pink, thin coating, moist",
            niram="Normal complexion, no pallor",
            mozhi="Clear speech, normal pitch",
            vizhi="No discharge, mild redness",
            nadi="Vatham dominant, Pitham secondary",
            mei="Normal temperature",
            muthiram="Pale yellow, clear",
            varmam="Tenderness at right shoulder varmam point",
            chief_complaints="Chronic shoulder pain, difficulty sleeping",
            diagnosis="Vatham-related shoulder pain",
        )

        # Prescription for consultation 1
        rx1 = Prescription.objects.create(
            consultation=c1,
            diet_advice="Avoid sour and cold foods. Increase warm soups.",
            lifestyle_advice="Apply warm compress before bed.",
            exercise_advice="Gentle shoulder rotation exercises daily.",
            follow_up_date=today,
            follow_up_notes="Check pain improvement after Varmam therapy",
        )
        Medication.objects.create(
            prescription=rx1,
            drug_name="Vatha Choornam",
            dosage="5g",
            frequency="BD",
            frequency_tamil="\u0b95\u0bbe\u0bb2\u0bc8-\u0bae\u0bbe\u0bb2\u0bc8",
            duration="15 days",
            instructions="After food with hot water",
            sort_order=0,
        )
        Medication.objects.create(
            prescription=rx1,
            drug_name="Karpoorathi Thailam",
            dosage="External application",
            frequency="BD",
            frequency_tamil="\u0b95\u0bbe\u0bb2\u0bc8-\u0bae\u0bbe\u0bb2\u0bc8",
            duration="15 days",
            instructions="Apply and massage on shoulder",
            sort_order=1,
        )
        ProcedureEntry.objects.create(
            prescription=rx1,
            name="Varmam therapy",
            details="Right shoulder - Kaikattu varmam, Kavuli varmam",
            duration="3 sessions, weekly",
        )

        # Consultation for Patient 2
        c2 = Consultation.objects.create(
            patient=p2,
            consultation_date=today - timedelta(days=3),
            weight=58,
            height=162,
            pulse_rate=72,
            temperature=98.6,
            bp_systolic=110,
            bp_diastolic=70,
            appetite="abnormal",
            appetite_notes="Reduced appetite for 2 weeks",
            bowel="normal",
            micturition="normal",
            sleep_quality="normal",
            naa="Slightly coated, dry",
            niram="Mild pallor",
            mozhi="Normal",
            vizhi="Normal",
            nadi="Pitham dominant",
            mei="Normal",
            muthiram="Normal color, slightly cloudy",
            chief_complaints="Loss of appetite, fatigue, mild headache",
            diagnosis="Pitham imbalance - Indigestion",
        )

        rx2 = Prescription.objects.create(
            consultation=c2,
            diet_advice="Light, easily digestible food. Avoid spicy and oily.",
            lifestyle_advice="Eat meals at regular times. Rest after lunch.",
            follow_up_date=today + timedelta(days=7),
        )
        Medication.objects.create(
            prescription=rx2,
            drug_name="Trikatu Choornam",
            dosage="3g",
            frequency="TDS",
            frequency_tamil="\u0bae\u0bc2\u0ba9\u0bcd\u0bb1\u0bc1 \u0bae\u0bc1\u0bb1\u0bc8",
            duration="7 days",
            instructions="Before food with honey",
            sort_order=0,
        )
        Medication.objects.create(
            prescription=rx2,
            drug_name="Amukkara Choornam",
            dosage="5g",
            frequency="BD",
            frequency_tamil="\u0b95\u0bbe\u0bb2\u0bc8-\u0bae\u0bbe\u0bb2\u0bc8",
            duration="15 days",
            instructions="After food with milk",
            sort_order=1,
        )

        # Consultation for Patient 3 (today - for dashboard stats)
        Consultation.objects.create(
            patient=p3,
            consultation_date=today,
            weight=68,
            height=165,
            pulse_rate=80,
            temperature=98.8,
            bp_systolic=140,
            bp_diastolic=90,
            appetite="normal",
            bowel="abnormal",
            bowel_notes="Constipation for 3 days",
            micturition="normal",
            sleep_quality="normal",
            naa="Coated tongue, yellowish",
            nadi="Vatham-Kapham mixed",
            chief_complaints="Knee pain, constipation",
            diagnosis="Vatham - Knee joint pain with constipation",
        )

        # Consultation for Patient 5 (today - no prescription yet)
        Consultation.objects.create(
            patient=p5,
            consultation_date=today,
            weight=82,
            height=175,
            pulse_rate=88,
            temperature=98.6,
            bp_systolic=135,
            bp_diastolic=88,
            appetite="normal",
            bowel="normal",
            micturition="abnormal",
            micturition_notes="Frequent urination, especially at night",
            sleep_quality="abnormal",
            sleep_notes="Poor sleep due to frequent urination",
            nadi="Kapham dominant",
            chief_complaints="Frequent urination, stress, weight gain",
            diagnosis="Kapham imbalance",
        )

        self.stdout.write(self.style.SUCCESS("Sample data created:"))
        for p in [p1, p2, p3, p4, p5]:
            self.stdout.write(f"  {p.record_id}: {p.name}")
        self.stdout.write(f"  Consultations: {Consultation.objects.count()}")
        self.stdout.write(f"  Prescriptions: {Prescription.objects.count()}")
