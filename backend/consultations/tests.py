from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from patients.models import Patient

from .models import Consultation

User = get_user_model()


class ConsultationModelTest(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Test Clinic",
            subdomain="consultation-test",
            discipline="siddha",
        )
        self.patient = Patient.objects.create(
            clinic=self.clinic,
            name="Test Patient",
            age=30,
            gender="male",
            phone="9876543210",
        )

    def test_create_consultation(self):
        consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date.today(),
            chief_complaints="Headache",
        )
        self.assertEqual(consultation.patient, self.patient)
        self.assertIn("Test Patient", str(consultation))

    def test_consultation_ordering(self):
        c1 = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date(2026, 1, 1),
        )
        c2 = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date(2026, 2, 1),
        )
        consultations = list(Consultation.objects.all())
        self.assertEqual(consultations[0], c2)  # Most recent first

    def test_patient_consultations_relation(self):
        Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date.today(),
        )
        self.assertEqual(self.patient.consultations.count(), 1)


class ConsultationAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="API Clinic",
            subdomain="consultation-api-test",
            discipline="siddha",
        )
        self.user = User.objects.create_user(
            username="doctor",
            password="testpass123",
            clinic=self.clinic,
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(
            HTTP_X_CLINIC_SLUG=self.clinic.subdomain,
            HTTP_HOST="localhost",
        )
        self.patient = Patient.objects.create(
            clinic=self.clinic,
            name="Test Patient",
            age=30,
            gender="male",
            phone="9876543210",
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
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date.today(),
        )
        response = self.client.get("/api/v1/consultations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_patient(self):
        other_patient = Patient.objects.create(
            clinic=self.clinic,
            name="Other",
            age=25,
            gender="female",
            phone="9876543211",
        )
        Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient, consultation_date=date.today()
        )
        Consultation.objects.create(
            clinic=self.clinic,
            patient=other_patient, consultation_date=date.today()
        )
        response = self.client.get(
            f"/api/v1/consultations/?patient={self.patient.pk}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_search_by_patient_name(self):
        Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient, consultation_date=date.today()
        )
        response = self.client.get("/api/v1/consultations/?search=Test Patient")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_has_prescription_annotation(self):
        consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient, consultation_date=date.today()
        )
        response = self.client.get("/api/v1/consultations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["results"][0]["has_prescription"])

    def test_patient_consultations_action(self):
        Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date.today(),
            diagnosis="Test diagnosis",
        )
        response = self.client.get(
            f"/api/v1/patients/{self.patient.pk}/consultations/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class ConsultationImportAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="Consult Import Clinic",
            subdomain="consult-import-test",
            discipline="siddha",
        )
        self.user = User.objects.create_user(
            username="importdoctor",
            password="testpass123",
            clinic=self.clinic,
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(
            HTTP_X_CLINIC_SLUG=self.clinic.subdomain,
            HTTP_HOST="localhost",
        )
        self.patient = Patient.objects.create(
            clinic=self.clinic,
            name="Import Patient",
            age=32,
            gender="female",
            phone="9000000001",
        )

    def _upload(self, name, content):
        return SimpleUploadedFile(name, content.encode("utf-8"), content_type="text/csv")

    def test_import_preview_and_confirm_success(self):
        csv_content = (
            "patient_phone,consultation_date,chief_complaints,diagnosis\n"
            "9000000001,2026-02-28,Headache,Migraine\n"
        )
        preview_response = self.client.post(
            "/api/v1/consultations/import/preview/",
            {"file": self._upload("consultations.csv", csv_content)},
        )
        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertTrue(preview_response.data["valid"])

        confirm_response = self.client.post(
            "/api/v1/consultations/import/confirm/",
            {"file": self._upload("consultations.csv", csv_content)},
        )
        self.assertEqual(confirm_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(confirm_response.data["created"], 1)
        self.assertEqual(Consultation.objects.filter(clinic=self.clinic).count(), 1)

    def test_import_confirm_duplicate_with_skip_duplicates(self):
        Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date(2026, 2, 28),
            chief_complaints="Existing",
            diagnosis="Existing Dx",
        )
        csv_content = (
            "patient_phone,consultation_date,chief_complaints,diagnosis\n"
            "9000000001,2026-02-28,Headache,Migraine\n"
        )

        response = self.client.post(
            "/api/v1/consultations/import/confirm/",
            {
                "file": self._upload("consultations.csv", csv_content),
                "skip_duplicates": "true",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"], 0)
        self.assertEqual(response.data["skipped"], 1)

    def test_import_confirm_duplicate_without_skip_duplicates_fails(self):
        Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date(2026, 2, 28),
            chief_complaints="Existing",
            diagnosis="Existing Dx",
        )
        csv_content = (
            "patient_phone,consultation_date,chief_complaints,diagnosis\n"
            "9000000001,2026-02-28,Headache,Migraine\n"
        )

        response = self.client.post(
            "/api/v1/consultations/import/confirm/",
            {
                "file": self._upload("consultations.csv", csv_content),
                "skip_duplicates": "false",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["created"], 0)
        self.assertEqual(Consultation.objects.filter(clinic=self.clinic).count(), 1)
