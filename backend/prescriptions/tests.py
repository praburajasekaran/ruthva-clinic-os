from datetime import date

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from consultations.models import Consultation
from patients.models import Patient

from .models import Medication, Prescription, ProcedureEntry


class PrescriptionModelTest(TestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9876543210"
        )
        self.consultation = Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )

    def test_create_prescription(self):
        prescription = Prescription.objects.create(
            consultation=self.consultation,
            diet_advice="Avoid cold foods",
        )
        self.assertIn("Test Patient", str(prescription))

    def test_one_to_one_constraint(self):
        Prescription.objects.create(consultation=self.consultation)
        with self.assertRaises(IntegrityError):
            Prescription.objects.create(consultation=self.consultation)

    def test_medication_ordering(self):
        prescription = Prescription.objects.create(
            consultation=self.consultation
        )
        m2 = Medication.objects.create(
            prescription=prescription,
            drug_name="Drug B",
            dosage="10mg",
            frequency="BD",
            duration="7 days",
            sort_order=2,
        )
        m1 = Medication.objects.create(
            prescription=prescription,
            drug_name="Drug A",
            dosage="5mg",
            frequency="OD",
            duration="14 days",
            sort_order=1,
        )
        meds = list(prescription.medications.all())
        self.assertEqual(meds[0], m1)
        self.assertEqual(meds[1], m2)


class PrescriptionAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        self.patient = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9876543210"
        )
        self.consultation = Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )

    def test_create_prescription_with_medications(self):
        data = {
            "consultation": self.consultation.pk,
            "diet_advice": "Avoid spicy food",
            "medications": [
                {
                    "drug_name": "Amukkirai Chooranam",
                    "dosage": "5g",
                    "frequency": "BD",
                    "duration": "30 days",
                    "sort_order": 1,
                },
                {
                    "drug_name": "Nilavembu Kudineer",
                    "dosage": "60ml",
                    "frequency": "BD",
                    "duration": "15 days",
                    "sort_order": 2,
                },
            ],
            "procedures": [
                {
                    "name": "Thokkanam",
                    "details": "Oil massage therapy",
                    "duration": "45 minutes",
                },
            ],
        }
        response = self.client.post(
            "/api/v1/prescriptions/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        prescription = Prescription.objects.get(pk=response.data["id"])
        self.assertEqual(prescription.medications.count(), 2)
        self.assertEqual(prescription.procedures.count(), 1)

    def test_update_prescription_replaces_medications(self):
        prescription = Prescription.objects.create(
            consultation=self.consultation
        )
        Medication.objects.create(
            prescription=prescription,
            drug_name="Old Drug",
            dosage="5mg",
            frequency="OD",
            duration="7 days",
        )
        data = {
            "consultation": self.consultation.pk,
            "medications": [
                {
                    "drug_name": "New Drug",
                    "dosage": "10mg",
                    "frequency": "BD",
                    "duration": "14 days",
                    "sort_order": 1,
                },
            ],
        }
        response = self.client.put(
            f"/api/v1/prescriptions/{prescription.pk}/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(prescription.medications.count(), 1)
        self.assertEqual(prescription.medications.first().drug_name, "New Drug")

    def test_list_prescriptions(self):
        Prescription.objects.create(consultation=self.consultation)
        response = self.client.get("/api/v1/prescriptions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_duplicate_prescription_for_same_consultation(self):
        data = {"consultation": self.consultation.pk}
        self.client.post("/api/v1/prescriptions/", data, format="json")
        response = self.client.post(
            "/api/v1/prescriptions/", data, format="json"
        )
        self.assertEqual(
            response.status_code, status.HTTP_400_BAD_REQUEST
        )


class DashboardStatsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_stats(self):
        response = self.client.get("/api/v1/dashboard/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("today_patients", response.data)
        self.assertIn("week_patients", response.data)
        self.assertIn("pending_prescriptions", response.data)
        self.assertIn("follow_ups_due", response.data)
        self.assertIn("total_patients", response.data)

    def test_dashboard_stats_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/dashboard/stats/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_stats_accuracy(self):
        patient = Patient.objects.create(
            name="Stats Test", age=30, gender="male", phone="9876543210"
        )
        consultation = Consultation.objects.create(
            patient=patient, consultation_date=date.today()
        )
        # No prescription yet => pending_prescriptions should be 1
        response = self.client.get("/api/v1/dashboard/stats/")
        self.assertEqual(response.data["today_patients"], 1)
        self.assertEqual(response.data["pending_prescriptions"], 1)
        self.assertEqual(response.data["total_patients"], 1)

        # Add prescription => pending should drop to 0
        Prescription.objects.create(consultation=consultation)
        response = self.client.get("/api/v1/dashboard/stats/")
        self.assertEqual(response.data["pending_prescriptions"], 0)
