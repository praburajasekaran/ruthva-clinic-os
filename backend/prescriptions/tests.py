from datetime import date

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from consultations.models import Consultation
from patients.models import Patient

from .models import Medication, Prescription, ProcedureEntry


class PrescriptionAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        self.patient = Patient.objects.create(
            name="Test Patient", age=40, gender="male", phone="9000000001"
        )
        self.consultation = Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )

    def test_create_prescription_with_medications(self):
        data = {
            "consultation": self.consultation.id,
            "diet_advice": "Avoid cold food",
            "medications": [
                {
                    "drug_name": "Choornam X",
                    "dosage": "5g",
                    "frequency": "BD",
                    "duration": "15 days",
                    "instructions": "After food",
                    "sort_order": 0,
                },
                {
                    "drug_name": "Thailam Y",
                    "dosage": "External",
                    "frequency": "OD",
                    "duration": "7 days",
                    "sort_order": 1,
                },
            ],
            "procedures": [
                {
                    "name": "Varmam therapy",
                    "details": "Right shoulder",
                    "duration": "3 sessions",
                }
            ],
        }
        response = self.client.post(
            "/api/v1/prescriptions/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        rx = Prescription.objects.get(pk=response.data["id"])
        self.assertEqual(rx.medications.count(), 2)
        self.assertEqual(rx.procedures.count(), 1)

    def test_one_to_one_constraint(self):
        Prescription.objects.create(consultation=self.consultation)
        with self.assertRaises(IntegrityError):
            Prescription.objects.create(consultation=self.consultation)

    def test_update_replaces_medications(self):
        rx = Prescription.objects.create(consultation=self.consultation)
        Medication.objects.create(
            prescription=rx,
            drug_name="Old Med",
            dosage="1g",
            frequency="OD",
            duration="7 days",
        )
        data = {
            "consultation": self.consultation.id,
            "medications": [
                {
                    "drug_name": "New Med",
                    "dosage": "2g",
                    "frequency": "BD",
                    "duration": "14 days",
                    "sort_order": 0,
                }
            ],
        }
        response = self.client.put(
            f"/api/v1/prescriptions/{rx.id}/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(rx.medications.count(), 1)
        self.assertEqual(rx.medications.first().drug_name, "New Med")

    def test_list_prescriptions(self):
        Prescription.objects.create(consultation=self.consultation)
        response = self.client.get("/api/v1/prescriptions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("medication_count", response.data["results"][0])

    def test_medication_sort_order(self):
        rx = Prescription.objects.create(consultation=self.consultation)
        Medication.objects.create(
            prescription=rx,
            drug_name="Second",
            dosage="1g",
            frequency="OD",
            duration="7 days",
            sort_order=1,
        )
        Medication.objects.create(
            prescription=rx,
            drug_name="First",
            dosage="2g",
            frequency="BD",
            duration="14 days",
            sort_order=0,
        )
        meds = list(rx.medications.all())
        self.assertEqual(meds[0].drug_name, "First")
        self.assertEqual(meds[1].drug_name, "Second")
