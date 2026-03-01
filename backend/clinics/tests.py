import io
import zipfile
from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import resolve
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from rest_framework.test import APIClient

from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import Medication, Prescription

from .models import Clinic, DataExportAudit

User = get_user_model()


class ExportEndpointsTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        self.clinic = Clinic.objects.create(
            name="Export Clinic",
            subdomain="export-clinic",
            discipline="siddha",
        )
        self.owner = User.objects.create_user(
            username="owner",
            password="testpass123",
            clinic=self.clinic,
            is_clinic_owner=True,
            role="admin",
        )
        self.client.force_authenticate(user=self.owner)
        self.client.credentials(HTTP_X_CLINIC_SLUG=self.clinic.subdomain, HTTP_HOST="localhost")

        self.patient = Patient.objects.create(
            clinic=self.clinic,
            name="Export Patient",
            age=34,
            gender="female",
            phone="9333333333",
        )
        self.consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date(2026, 2, 28),
            chief_complaints="Fever",
            diagnosis="Viral",
        )
        self.prescription = Prescription.objects.create(
            clinic=self.clinic,
            consultation=self.consultation,
            diet_advice="Hydrate",
        )
        Medication.objects.create(
            prescription=self.prescription,
            drug_name="Nilavembu Kudineer",
            dosage="60ml",
            frequency="BD",
            duration="5 days",
            sort_order=1,
        )

    def test_export_patients_csv_owner_only_and_audited(self):
        response = self.client.get("/api/v1/export/patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"].split(";")[0], "text/csv")
        self.assertIn("patients.csv", response["Content-Disposition"])
        self.assertTrue(
            DataExportAudit.objects.filter(
                clinic=self.clinic,
                actor=self.owner,
                endpoint="/api/v1/export/patients/",
            ).exists()
        )

    def test_export_all_zip_contains_expected_files(self):
        response = self.client.get("/api/v1/export/all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/zip")

        archive = zipfile.ZipFile(io.BytesIO(response.content))
        names = set(archive.namelist())
        self.assertEqual(
            names,
            {"patients.csv", "consultations.csv", "prescriptions.csv"},
        )

    def test_export_denied_for_non_owner(self):
        member = User.objects.create_user(
            username="member",
            password="testpass123",
            clinic=self.clinic,
            is_clinic_owner=False,
            role="doctor",
        )
        self.client.force_authenticate(user=member)
        response = self.client.get("/api/v1/export/patients/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_export_tenant_isolation_by_header(self):
        other_clinic = Clinic.objects.create(
            name="Other Clinic",
            subdomain="other-clinic",
            discipline="siddha",
        )
        owner_other = User.objects.create_user(
            username="otherowner",
            password="testpass123",
            clinic=other_clinic,
            is_clinic_owner=True,
            role="admin",
        )
        self.client.force_authenticate(user=owner_other)
        self.client.credentials(HTTP_X_CLINIC_SLUG=self.clinic.subdomain, HTTP_HOST="localhost")

        response = self.client.get("/api/v1/export/patients/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_export_endpoint_configures_user_throttle(self):
        resolved = resolve("/api/v1/export/patients/")
        throttle_classes = resolved.func.cls.throttle_classes
        self.assertIn(UserRateThrottle, throttle_classes)
