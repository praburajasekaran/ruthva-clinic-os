from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import FamilyHistory, MedicalHistory, Patient


class PatientModelTest(TestCase):
    def test_record_id_auto_generation(self):
        patient = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9876543210"
        )
        year = timezone.now().year
        self.assertEqual(patient.record_id, f"PAT-{year}-001")

    def test_record_id_increments(self):
        Patient.objects.create(
            name="Patient 1", age=30, gender="male", phone="9876543210"
        )
        patient2 = Patient.objects.create(
            name="Patient 2", age=25, gender="female", phone="9876543211"
        )
        year = timezone.now().year
        self.assertEqual(patient2.record_id, f"PAT-{year}-002")

    def test_str_representation(self):
        patient = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9876543210"
        )
        self.assertIn("Test Patient", str(patient))
        self.assertIn("PAT-", str(patient))

    def test_medical_history_relation(self):
        patient = Patient.objects.create(
            name="Test", age=30, gender="male", phone="9876543210"
        )
        MedicalHistory.objects.create(
            patient=patient, disease="Diabetes", duration="5 years"
        )
        self.assertEqual(patient.medical_history.count(), 1)

    def test_family_history_relation(self):
        patient = Patient.objects.create(
            name="Test", age=30, gender="male", phone="9876543210"
        )
        FamilyHistory.objects.create(
            patient=patient, relation="Father", disease="Hypertension"
        )
        self.assertEqual(patient.family_history.count(), 1)


class PatientAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_create_patient(self):
        data = {
            "name": "API Patient",
            "age": 35,
            "gender": "male",
            "phone": "9876543299",
        }
        response = self.client.post("/api/v1/patients/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("record_id", response.data)
        self.assertTrue(response.data["record_id"].startswith("PAT-"))

    def test_create_patient_with_nested_history(self):
        data = {
            "name": "Nested Patient",
            "age": 40,
            "gender": "female",
            "phone": "9876543298",
            "medical_history": [
                {"disease": "Asthma", "duration": "10 years", "medication": "Inhaler"},
            ],
            "family_history": [
                {"relation": "Mother", "disease": "Diabetes"},
            ],
        }
        response = self.client.post("/api/v1/patients/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        patient = Patient.objects.get(pk=response.data["id"])
        self.assertEqual(patient.medical_history.count(), 1)
        self.assertEqual(patient.family_history.count(), 1)

    def test_list_patients(self):
        Patient.objects.create(
            name="List Test", age=30, gender="male", phone="9876543297"
        )
        response = self.client.get("/api/v1/patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_search_patients(self):
        Patient.objects.create(
            name="Searchable", age=30, gender="male", phone="9876543296"
        )
        response = self.client.get("/api/v1/patients/?search=Searchable")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_search_by_phone(self):
        Patient.objects.create(
            name="Phone Test", age=30, gender="male", phone="1111111111"
        )
        response = self.client.get("/api/v1/patients/?search=1111111111")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_unauthenticated_access_denied(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/patients/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_patient_nested_history(self):
        patient = Patient.objects.create(
            name="Update Test", age=30, gender="male", phone="9876543295"
        )
        MedicalHistory.objects.create(
            patient=patient, disease="Old Disease", duration="1 year"
        )
        data = {
            "name": "Update Test",
            "age": 31,
            "gender": "male",
            "phone": "9876543295",
            "medical_history": [
                {"disease": "New Disease", "duration": "2 years", "medication": ""},
            ],
        }
        response = self.client.put(
            f"/api/v1/patients/{patient.pk}/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(patient.medical_history.count(), 1)
        self.assertEqual(patient.medical_history.first().disease, "New Disease")
