from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from patients.models import Patient

from .models import Consultation


class ConsultationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        self.patient = Patient.objects.create(
            name="Test Patient", age=40, gender="male", phone="9000000001"
        )

    def test_create_consultation(self):
        data = {
            "patient": self.patient.id,
            "consultation_date": str(date.today()),
            "weight": 70,
            "pulse_rate": 72,
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "appetite": "normal",
            "naa": "Pink, moist",
            "nadi": "Vatham dominant",
            "chief_complaints": "Headache",
        }
        response = self.client.post(
            "/api/v1/consultations/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patient"], self.patient.id)

    def test_list_consultations(self):
        Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )
        response = self.client.get("/api/v1/consultations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("has_prescription", response.data["results"][0])

    def test_filter_by_patient(self):
        other_patient = Patient.objects.create(
            name="Other", age=30, gender="female", phone="9000000002"
        )
        Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )
        Consultation.objects.create(
            patient=other_patient, consultation_date=date.today()
        )
        response = self.client.get(
            f"/api/v1/consultations/?patient={self.patient.id}"
        )
        self.assertEqual(response.data["count"], 1)

    def test_patient_consultations_action(self):
        Consultation.objects.create(
            patient=self.patient,
            consultation_date=date.today(),
            diagnosis="Test diagnosis",
        )
        response = self.client.get(
            f"/api/v1/patients/{self.patient.id}/consultations/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
