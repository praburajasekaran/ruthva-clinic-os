from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from .models import FamilyHistory, MedicalHistory, Patient

User = get_user_model()


class PatientModelTest(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Patient Test Clinic",
            subdomain="patient-test",
            discipline="siddha",
        )

    def test_record_id_auto_generation(self):
        patient = Patient.objects.create(
            clinic=self.clinic,
            name="Test Patient",
            age=30,
            gender="male",
            phone="9876543210",
        )
        year = timezone.now().year
        self.assertEqual(patient.record_id, f"PAT-{year}-0001")

    def test_record_id_increments(self):
        Patient.objects.create(
            clinic=self.clinic,
            name="Patient 1",
            age=30,
            gender="male",
            phone="9876543210",
        )
        patient2 = Patient.objects.create(
            clinic=self.clinic,
            name="Patient 2",
            age=25,
            gender="female",
            phone="9876543211",
        )
        year = timezone.now().year
        self.assertEqual(patient2.record_id, f"PAT-{year}-0002")

    def test_str_representation(self):
        patient = Patient.objects.create(
            clinic=self.clinic,
            name="Test Patient",
            age=30,
            gender="male",
            phone="9876543210",
        )
        self.assertIn("Test Patient", str(patient))
        self.assertIn("PAT-", str(patient))

    def test_medical_history_relation(self):
        patient = Patient.objects.create(
            clinic=self.clinic,
            name="Test",
            age=30,
            gender="male",
            phone="9876543210",
        )
        MedicalHistory.objects.create(
            patient=patient, disease="Diabetes", duration="5 years"
        )
        self.assertEqual(patient.medical_history.count(), 1)

    def test_family_history_relation(self):
        patient = Patient.objects.create(
            clinic=self.clinic,
            name="Test",
            age=30,
            gender="male",
            phone="9876543210",
        )
        FamilyHistory.objects.create(
            patient=patient, relation="Father", disease="Hypertension"
        )
        self.assertEqual(patient.family_history.count(), 1)


class PatientAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.clinic = Clinic.objects.create(
            name="Patient API Clinic",
            subdomain="patient-api-test",
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

    def test_create_patient(self):
        data = {
            "name": "New Patient",
            "age": 35,
            "gender": "male",
            "phone": "9111111111",
        }
        response = self.client.post("/api/v1/patients/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("record_id", response.data)

    def test_create_patient_with_nested_history(self):
        data = {
            "name": "Patient With History",
            "age": 50,
            "gender": "female",
            "phone": "9222222222",
            "medical_history": [
                {"disease": "Diabetes", "duration": "5 years", "medication": "Metformin"}
            ],
            "family_history": [
                {"relation": "Mother", "disease": "Hypertension", "duration": "10 years"}
            ],
        }
        response = self.client.post("/api/v1/patients/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        patient = Patient.objects.get(pk=response.data["id"])
        self.assertEqual(patient.medical_history.count(), 1)
        self.assertEqual(patient.family_history.count(), 1)

    def test_list_patients(self):
        Patient.objects.create(
            clinic=self.clinic,
            name="List Test",
            age=30,
            gender="male",
            phone="9876543297",
        )
        response = self.client.get("/api/v1/patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_search_patients(self):
        Patient.objects.create(
            clinic=self.clinic,
            name="Rajan Kumar",
            age=45,
            gender="male",
            phone="9876543210",
        )
        Patient.objects.create(
            clinic=self.clinic,
            name="Priya S", age=32, gender="female", phone="9123456789"
        )
        response = self.client.get("/api/v1/patients/?search=Rajan")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Rajan Kumar")

    def test_search_by_phone(self):
        Patient.objects.create(
            clinic=self.clinic,
            name="Rajan Kumar",
            age=45,
            gender="male",
            phone="9876543210",
        )
        response = self.client.get("/api/v1/patients/?search=9876")
        self.assertEqual(response.data["count"], 1)

    def test_unauthenticated_access_denied(self):
        client = APIClient()
        response = client.get("/api/v1/patients/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_patient_nested_history(self):
        patient = Patient.objects.create(
            clinic=self.clinic,
            name="Original",
            age=30,
            gender="male",
            phone="9876543295",
        )
        MedicalHistory.objects.create(
            patient=patient, disease="Old Disease", duration="1 year"
        )
        data = {
            "name": "Updated",
            "age": 31,
            "gender": "male",
            "phone": "9444444444",
            "medical_history": [
                {"disease": "New Disease", "duration": "2 years", "medication": "Med A"}
            ],
        }
        response = self.client.put(
            f"/api/v1/patients/{patient.id}/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(patient.medical_history.count(), 1)
        self.assertEqual(patient.medical_history.first().disease, "New Disease")

    def test_patient_import_preview_confirm_contract(self):
        csv_content = (
            "name,age,gender,phone\n"
            "Import Patient,29,male,9222222222\n"
        )
        file = SimpleUploadedFile("patients.csv", csv_content.encode("utf-8"), content_type="text/csv")
        preview_response = self.client.post(
            "/api/v1/patients/import/preview/",
            {"file": file},
        )
        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertIn("valid", preview_response.data)
        self.assertIn("preview", preview_response.data)

        confirm_response = self.client.post(
            "/api/v1/patients/import/confirm/",
            {"file": SimpleUploadedFile("patients.csv", csv_content.encode("utf-8"), content_type="text/csv")},
        )
        self.assertEqual(confirm_response.status_code, status.HTTP_201_CREATED)
        self.assertIn("created", confirm_response.data)
        self.assertIn("skipped", confirm_response.data)
        self.assertIn("errors", confirm_response.data)


class PatientImportWithDiagnosisTests(TestCase):
    """Tests for extended import with diagnosis, last_seen_date, next_review_date."""

    def setUp(self):
        cache.clear()
        self.clinic = Clinic.objects.create(
            name="Import Test Clinic",
            subdomain="import-test",
            discipline="siddha",
        )
        self.user = User.objects.create_user(
            username="import_doctor",
            password="testpass123",
            clinic=self.clinic,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.client.credentials(
            HTTP_X_CLINIC_SLUG=self.clinic.subdomain,
            HTTP_HOST="localhost",
        )

    def _make_csv(self, rows_str):
        return SimpleUploadedFile(
            "patients.csv",
            rows_str.encode("utf-8"),
            content_type="text/csv",
        )

    def test_import_with_diagnosis_creates_consultation(self):
        csv = (
            "name,age,gender,phone,diagnosis,last_seen_date\n"
            "Ravi Kumar,45,male,9876543210,Chronic sinusitis,2026-03-01\n"
        )
        resp = self.client.post(
            "/api/v1/patients/import/confirm/",
            {"file": self._make_csv(csv)},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["created"], 1)
        self.assertEqual(resp.data["consultation_created_count"], 1)

        from consultations.models import Consultation
        patient = Patient.objects.get(phone="9876543210", clinic=self.clinic)
        consult = Consultation.objects.get(patient=patient, clinic=self.clinic)
        self.assertEqual(consult.diagnosis, "Chronic sinusitis")
        self.assertEqual(str(consult.consultation_date), "2026-03-01")
        self.assertTrue(consult.is_imported)

    def test_import_diagnosis_without_last_seen_uses_today(self):
        csv = (
            "name,age,gender,phone,diagnosis\n"
            "Priya Sharma,30,female,9876543211,Migraine\n"
        )
        resp = self.client.post(
            "/api/v1/patients/import/confirm/",
            {"file": self._make_csv(csv)},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["consultation_created_count"], 1)

        from consultations.models import Consultation
        from datetime import date
        consult = Consultation.objects.get(
            patient__phone="9876543211", clinic=self.clinic
        )
        self.assertEqual(consult.consultation_date, date.today())

    def test_import_without_diagnosis_skips_consultation(self):
        csv = (
            "name,age,gender,phone\n"
            "Arun Dev,25,male,9876543212\n"
        )
        resp = self.client.post(
            "/api/v1/patients/import/confirm/",
            {"file": self._make_csv(csv)},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["created"], 1)
        self.assertEqual(resp.data["consultation_created_count"], 0)

    def test_import_preview_warns_past_review_date(self):
        csv = (
            "name,age,gender,phone,next_review_date\n"
            "Test User,30,male,9876543213,2020-01-01\n"
        )
        resp = self.client.post(
            "/api/v1/patients/import/preview/",
            {"file": self._make_csv(csv)},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["valid"])  # warnings don't invalidate
        self.assertGreater(resp.data.get("warning_count", 0), 0)

    def test_import_rejects_future_last_seen_date(self):
        csv = (
            "name,age,gender,phone,last_seen_date\n"
            "Future Patient,30,male,9876543214,2030-01-01\n"
        )
        resp = self.client.post(
            "/api/v1/patients/import/preview/",
            {"file": self._make_csv(csv)},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["valid"])
        self.assertEqual(resp.data["error_count"], 1)

    def test_import_detects_duplicate_phone_in_csv(self):
        csv = (
            "name,age,gender,phone\n"
            "Patient A,30,male,9876543215\n"
            "Patient B,25,female,9876543215\n"
        )
        resp = self.client.post(
            "/api/v1/patients/import/preview/",
            {"file": self._make_csv(csv)},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["valid"])
        self.assertEqual(resp.data["error_count"], 1)

    def test_import_returns_ruthva_sync_key(self):
        csv = (
            "name,age,gender,phone\n"
            "Sync Patient,30,male,9876543216\n"
        )
        resp = self.client.post(
            "/api/v1/patients/import/confirm/",
            {"file": self._make_csv(csv)},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("ruthva_sync", resp.data)
        # No RUTHVA_API_URL configured, so sync should be 0
        self.assertEqual(resp.data["ruthva_sync"]["synced"], 0)


class BulkPatientActionTests(TestCase):
    """Tests for bulk delete and bulk toggle active endpoints."""

    def setUp(self):
        cache.clear()
        self.clinic = Clinic.objects.create(
            name="Bulk Test Clinic",
            subdomain="bulk-test",
            discipline="siddha",
        )
        self.other_clinic = Clinic.objects.create(
            name="Other Clinic",
            subdomain="other-clinic",
            discipline="ayurveda",
        )
        self.user = User.objects.create_user(
            username="bulk_doctor",
            password="testpass123",
            clinic=self.clinic,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.client.credentials(
            HTTP_X_CLINIC_SLUG=self.clinic.subdomain,
            HTTP_HOST="localhost",
        )
        # Create test patients
        self.patients = []
        for i in range(5):
            p = Patient.objects.create(
                clinic=self.clinic,
                name=f"Patient {i}",
                age=30 + i,
                gender="male",
                phone=f"987654321{i}",
            )
            self.patients.append(p)
        # Create a patient in another clinic
        self.other_patient = Patient.objects.create(
            clinic=self.other_clinic,
            name="Other Patient",
            age=40,
            gender="female",
            phone="9123456789",
        )

    def test_bulk_delete(self):
        ids = [self.patients[0].id, self.patients[1].id]
        resp = self.client.post("/api/v1/patients/bulk-delete/", {"ids": ids})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["deleted"], 2)
        self.assertEqual(Patient.objects.filter(clinic=self.clinic).count(), 3)

    def test_bulk_delete_cross_tenant_isolation(self):
        """Deleting another clinic's patient IDs should not affect them."""
        resp = self.client.post(
            "/api/v1/patients/bulk-delete/",
            {"ids": [self.other_patient.id]},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["deleted"], 0)
        self.assertTrue(Patient.objects.filter(id=self.other_patient.id).exists())

    def test_bulk_toggle_active_archive(self):
        ids = [self.patients[0].id, self.patients[1].id, self.patients[2].id]
        resp = self.client.post(
            "/api/v1/patients/bulk-toggle-active/",
            {"ids": ids, "is_active": False},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["updated"], 3)
        archived = Patient.objects.filter(id__in=ids, is_active=False).count()
        self.assertEqual(archived, 3)

    def test_bulk_toggle_active_activate(self):
        # First archive
        for p in self.patients[:2]:
            p.is_active = False
            p.save()
        ids = [self.patients[0].id, self.patients[1].id]
        resp = self.client.post(
            "/api/v1/patients/bulk-toggle-active/",
            {"ids": ids, "is_active": True},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["updated"], 2)
        active = Patient.objects.filter(id__in=ids, is_active=True).count()
        self.assertEqual(active, 2)

    def test_bulk_delete_empty_ids_rejected(self):
        resp = self.client.post("/api/v1/patients/bulk-delete/", {"ids": []})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_toggle_missing_is_active_rejected(self):
        resp = self.client.post(
            "/api/v1/patients/bulk-toggle-active/",
            {"ids": [self.patients[0].id]},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
