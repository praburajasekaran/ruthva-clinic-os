from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from patients.models import Patient

from .models import Consultation


class ConsultationModelTest(TestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9876543210"
        )

    def test_create_consultation(self):
        consultation = Consultation.objects.create(
            patient=self.patient,
            consultation_date=date.today(),
            chief_complaints="Headache",
        )
        self.assertEqual(consultation.patient, self.patient)
        self.assertIn("Test Patient", str(consultation))

    def test_consultation_ordering(self):
        c1 = Consultation.objects.create(
            patient=self.patient,
            consultation_date=date(2026, 1, 1),
        )
        c2 = Consultation.objects.create(
            patient=self.patient,
            consultation_date=date(2026, 2, 1),
        )
        consultations = list(Consultation.objects.all())
        self.assertEqual(consultations[0], c2)  # Most recent first

    def test_patient_consultations_relation(self):
        Consultation.objects.create(
            patient=self.patient,
            consultation_date=date.today(),
        )
        self.assertEqual(self.patient.consultations.count(), 1)


class ConsultationAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
        self.patient = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9876543210"
        )

    def test_create_consultation(self):
        data = {
            "patient": self.patient.pk,
            "consultation_date": "2026-02-17",
            "chief_complaints": "Joint pain",
            "naa": "Normal tongue",
            "nadi": "Vatha predominant",
        }
        response = self.client.post(
            "/api/v1/consultations/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_consultations(self):
        Consultation.objects.create(
            patient=self.patient,
            consultation_date=date.today(),
        )
        response = self.client.get("/api/v1/consultations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_patient(self):
        other_patient = Patient.objects.create(
            name="Other", age=25, gender="female", phone="9876543211"
        )
        Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )
        Consultation.objects.create(
            patient=other_patient, consultation_date=date.today()
        )
        response = self.client.get(
            f"/api/v1/consultations/?patient={self.patient.pk}"
        )
        self.assertEqual(response.data["count"], 1)

    def test_search_by_patient_name(self):
        Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )
        response = self.client.get("/api/v1/consultations/?search=Test Patient")
        self.assertEqual(response.data["count"], 1)

    def test_has_prescription_annotation(self):
        consultation = Consultation.objects.create(
            patient=self.patient, consultation_date=date.today()
        )
        response = self.client.get("/api/v1/consultations/")
        self.assertFalse(response.data["results"][0]["has_prescription"])

    def test_patient_consultations_action(self):
        Consultation.objects.create(
            patient=self.patient,
            consultation_date=date.today(),
            diagnosis="Test diagnosis",
        )
        response = self.client.get(
            f"/api/v1/patients/{self.patient.pk}/consultations/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
