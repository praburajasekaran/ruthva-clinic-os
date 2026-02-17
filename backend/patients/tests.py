from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import FamilyHistory, MedicalHistory, Patient


class PatientModelTests(TestCase):
    def test_record_id_auto_generated(self):
        p = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9000000001"
        )
        self.assertTrue(p.record_id.startswith("PAT-"))
        self.assertEqual(len(p.record_id.split("-")), 3)

    def test_record_id_increments(self):
        p1 = Patient.objects.create(
            name="Patient 1", age=30, gender="male", phone="9000000001"
        )
        p2 = Patient.objects.create(
            name="Patient 2", age=25, gender="female", phone="9000000002"
        )
        num1 = int(p1.record_id.split("-")[-1])
        num2 = int(p2.record_id.split("-")[-1])
        self.assertEqual(num2, num1 + 1)

    def test_str_representation(self):
        p = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9000000001"
        )
        self.assertIn("Test Patient", str(p))
        self.assertIn("PAT-", str(p))


class PatientAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

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
            name="Patient A", age=30, gender="male", phone="9333333333"
        )
        response = self.client.get("/api/v1/patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_search_patients(self):
        Patient.objects.create(
            name="Rajan Kumar", age=45, gender="male", phone="9876543210"
        )
        Patient.objects.create(
            name="Priya S", age=32, gender="female", phone="9123456789"
        )
        response = self.client.get("/api/v1/patients/?search=Rajan")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Rajan Kumar")

    def test_search_by_phone(self):
        Patient.objects.create(
            name="Rajan Kumar", age=45, gender="male", phone="9876543210"
        )
        response = self.client.get("/api/v1/patients/?search=9876")
        self.assertEqual(response.data["count"], 1)

    def test_unauthenticated_access_denied(self):
        client = APIClient()
        response = client.get("/api/v1/patients/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_patient_nested_history(self):
        patient = Patient.objects.create(
            name="Original", age=30, gender="male", phone="9444444444"
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
