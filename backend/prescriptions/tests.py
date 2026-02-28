from datetime import date

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from consultations.models import Consultation
from patients.models import Patient

from .models import Medication, Prescription, ProcedureEntry

User = get_user_model()


class PrescriptionModelTest(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Prescription Test Clinic",
            subdomain="prescription-test",
            discipline="siddha",
        )
        self.patient = Patient.objects.create(
            clinic=self.clinic,
            name="Test Patient",
            age=30,
            gender="male",
            phone="9876543210",
        )
        self.consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date.today(),
        )

    def test_create_prescription(self):
        prescription = Prescription.objects.create(
            clinic=self.clinic,
            consultation=self.consultation,
            diet_advice="Avoid cold foods",
        )
        self.assertIn("Test Patient", str(prescription))

    def test_one_to_one_constraint(self):
        Prescription.objects.create(
            clinic=self.clinic,
            consultation=self.consultation,
        )
        with self.assertRaises(IntegrityError):
            Prescription.objects.create(
                clinic=self.clinic,
                consultation=self.consultation,
            )

    def test_medication_ordering(self):
        prescription = Prescription.objects.create(
            clinic=self.clinic,
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
        cache.clear()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="Prescription API Clinic",
            subdomain="prescription-api-test",
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
        self.consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date.today(),
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

    def test_update_prescription_replaces_medications(self):
        rx = Prescription.objects.create(
            clinic=self.clinic,
            consultation=self.consultation
        )
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
        Prescription.objects.create(
            clinic=self.clinic,
            consultation=self.consultation,
        )
        response = self.client.get("/api/v1/prescriptions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("medication_count", response.data["results"][0])

    def test_medication_sort_order(self):
        rx = Prescription.objects.create(
            clinic=self.clinic,
            consultation=self.consultation
        )
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


class DashboardStatsTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="Dashboard Test Clinic",
            subdomain="dashboard-test",
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
            clinic=self.clinic,
            name="Stats Test",
            age=30,
            gender="male",
            phone="9876543210",
        )
        consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=patient,
            consultation_date=date.today(),
        )
        # No prescription yet => pending_prescriptions should be 1
        response = self.client.get("/api/v1/dashboard/stats/")
        self.assertEqual(response.data["today_patients"], 1)
        self.assertEqual(response.data["pending_prescriptions"], 1)
        self.assertEqual(response.data["total_patients"], 1)

        # Add prescription => pending should drop to 0
        Prescription.objects.create(
            clinic=self.clinic,
            consultation=consultation,
        )
        response = self.client.get("/api/v1/dashboard/stats/")
        self.assertEqual(response.data["pending_prescriptions"], 0)


class PrescriptionImportAPITest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="Prescription Import Clinic",
            subdomain="prescription-import-test",
            discipline="siddha",
        )
        self.user = User.objects.create_user(
            username="rximportdoctor",
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
            name="Rx Import Patient",
            age=28,
            gender="male",
            phone="9111111111",
        )

    def _upload(self, name, content):
        return SimpleUploadedFile(name, content.encode("utf-8"), content_type="text/csv")

    def test_import_ordering_fails_when_consultation_missing(self):
        csv_content = (
            "patient_phone,consultation_date,row_type,drug_name,dosage,frequency,duration\n"
            "9111111111,2026-02-28,medication,Drug A,5mg,BD,7 days\n"
        )
        response = self.client.post(
            "/api/v1/prescriptions/import/confirm/",
            {"file": self._upload("prescriptions.csv", csv_content)},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Prescription.objects.filter(clinic=self.clinic).count(), 0)
        self.assertIn("Import consultations first", str(response.data["errors"]))

    def test_import_preview_and_confirm_success(self):
        Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date(2026, 2, 28),
            chief_complaints="Pain",
            diagnosis="Muscle strain",
        )
        csv_content = (
            "patient_phone,consultation_date,row_type,drug_name,dosage,frequency,duration,instructions,sort_order,diet_advice\n"
            "9111111111,2026-02-28,medication,Drug A,5mg,BD,7 days,After food,1,Avoid oily food\n"
        )

        preview_response = self.client.post(
            "/api/v1/prescriptions/import/preview/",
            {"file": self._upload("prescriptions.csv", csv_content)},
        )
        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertTrue(preview_response.data["valid"])

        confirm_response = self.client.post(
            "/api/v1/prescriptions/import/confirm/",
            {"file": self._upload("prescriptions.csv", csv_content)},
        )
        self.assertEqual(confirm_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(confirm_response.data["created"], 1)
        prescription = Prescription.objects.get(clinic=self.clinic)
        self.assertEqual(prescription.medications.count(), 1)
        self.assertEqual(prescription.medications.first().drug_name, "Drug A")

    def test_import_duplicate_with_skip_duplicates(self):
        consultation = Consultation.objects.create(
            clinic=self.clinic,
            patient=self.patient,
            consultation_date=date(2026, 2, 28),
            chief_complaints="Pain",
            diagnosis="Muscle strain",
        )
        Prescription.objects.create(clinic=self.clinic, consultation=consultation)
        csv_content = (
            "patient_phone,consultation_date,row_type,drug_name,dosage,frequency,duration\n"
            "9111111111,2026-02-28,medication,Drug A,5mg,BD,7 days\n"
        )
        response = self.client.post(
            "/api/v1/prescriptions/import/confirm/",
            {
                "file": self._upload("prescriptions.csv", csv_content),
                "skip_duplicates": "true",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"], 0)
        self.assertEqual(response.data["skipped"], 1)


class PdfSafeUrlFetcherTest(TestCase):
    """Ensure WeasyPrint url_fetcher blocks non-data URIs (SSRF defense-in-depth)."""

    def test_safe_url_fetcher_allows_data_uri(self):
        from prescriptions.pdf import _safe_url_fetcher

        data_uri = "data:image/png;base64,iVBORw0KGgo="
        result = _safe_url_fetcher(data_uri)
        # WeasyPrint returns a URLFetcherResponse; just verify it doesn't raise
        self.assertIsNotNone(result)

    def test_safe_url_fetcher_blocks_http(self):
        from prescriptions.pdf import _safe_url_fetcher

        with self.assertRaises(ValueError):
            _safe_url_fetcher("http://169.254.169.254/latest/meta-data/")

    def test_safe_url_fetcher_blocks_https(self):
        from prescriptions.pdf import _safe_url_fetcher

        with self.assertRaises(ValueError):
            _safe_url_fetcher("https://evil.com/logo.png")

    def test_safe_url_fetcher_blocks_file_scheme(self):
        from prescriptions.pdf import _safe_url_fetcher

        with self.assertRaises(ValueError):
            _safe_url_fetcher("file:///etc/passwd")

    def test_safe_url_fetcher_blocks_ftp_scheme(self):
        from prescriptions.pdf import _safe_url_fetcher

        with self.assertRaises(ValueError):
            _safe_url_fetcher("ftp://internal-server/data")


class FetchLogoAsDataUriTest(TestCase):
    """Unit tests for _fetch_logo_as_data_uri covering error paths and limits."""

    def test_returns_data_uri_for_valid_png(self):
        from unittest.mock import MagicMock, patch

        from prescriptions.pdf import _fetch_logo_as_data_uri

        fake_resp = MagicMock()
        fake_resp.headers = {"Content-Type": "image/png", "Content-Length": "4"}
        fake_resp.read.return_value = b"\x89PNG"

        with patch("prescriptions.pdf._logo_opener.open", return_value=fake_resp):
            result = _fetch_logo_as_data_uri("https://cdn.example.com/logo.png")

        self.assertTrue(result.startswith("data:image/png;base64,"))

    def test_returns_empty_on_disallowed_content_type(self):
        from unittest.mock import MagicMock, patch

        from prescriptions.pdf import _fetch_logo_as_data_uri

        fake_resp = MagicMock()
        fake_resp.headers = {"Content-Type": "text/html", "Content-Length": "100"}
        fake_resp.read.return_value = b"<html>not an image</html>"

        with patch("prescriptions.pdf._logo_opener.open", return_value=fake_resp):
            result = _fetch_logo_as_data_uri("https://cdn.example.com/page.html")

        self.assertEqual(result, "")

    def test_returns_empty_when_body_exceeds_max_bytes(self):
        from unittest.mock import MagicMock, patch

        from prescriptions.pdf import LOGO_MAX_BYTES, _fetch_logo_as_data_uri

        fake_resp = MagicMock()
        fake_resp.headers = {"Content-Type": "image/png"}
        fake_resp.read.return_value = b"x" * (LOGO_MAX_BYTES + 1)

        with patch("prescriptions.pdf._logo_opener.open", return_value=fake_resp):
            result = _fetch_logo_as_data_uri("https://cdn.example.com/huge.png")

        self.assertEqual(result, "")

    def test_returns_empty_when_content_length_exceeds_max(self):
        from unittest.mock import MagicMock, patch

        from prescriptions.pdf import LOGO_MAX_BYTES, _fetch_logo_as_data_uri

        fake_resp = MagicMock()
        fake_resp.headers = {
            "Content-Type": "image/png",
            "Content-Length": str(LOGO_MAX_BYTES + 1),
        }

        with patch("prescriptions.pdf._logo_opener.open", return_value=fake_resp):
            result = _fetch_logo_as_data_uri("https://cdn.example.com/big.png")

        self.assertEqual(result, "")

    def test_returns_empty_on_network_error(self):
        from unittest.mock import patch
        from urllib.error import URLError

        from prescriptions.pdf import _fetch_logo_as_data_uri

        with patch(
            "prescriptions.pdf._logo_opener.open",
            side_effect=URLError("connection refused"),
        ):
            result = _fetch_logo_as_data_uri("https://cdn.example.com/logo.png")

        self.assertEqual(result, "")

    def test_returns_empty_on_redirect_blocked(self):
        from unittest.mock import patch

        from prescriptions.pdf import _fetch_logo_as_data_uri

        with patch(
            "prescriptions.pdf._logo_opener.open",
            side_effect=ValueError("Redirect blocked"),
        ):
            result = _fetch_logo_as_data_uri("https://cdn.example.com/redir.png")

        self.assertEqual(result, "")
