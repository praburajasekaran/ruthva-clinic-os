from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from clinics.models import Clinic
from users.serializers import ClinicUpdateSerializer

User = get_user_model()


class ClinicLogoUrlSecurityTests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Logo Test Clinic",
            subdomain="logo-test-clinic",
            discipline="siddha",
        )

    @override_settings(CLINIC_LOGO_ALLOWED_HOSTS=["cdn.example.com"])
    def test_rejects_non_https_logo_url(self):
        serializer = ClinicUpdateSerializer(
            self.clinic,
            data={"logo_url": "http://cdn.example.com/logo.png"},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("logo_url", serializer.errors)

    @override_settings(CLINIC_LOGO_ALLOWED_HOSTS=["cdn.example.com"])
    def test_rejects_non_allowlisted_logo_host(self):
        serializer = ClinicUpdateSerializer(
            self.clinic,
            data={"logo_url": "https://evil.example.com/logo.png"},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("logo_url", serializer.errors)

    @override_settings(CLINIC_LOGO_ALLOWED_HOSTS=["cdn.example.com"])
    def test_allows_https_logo_from_allowlisted_host(self):
        serializer = ClinicUpdateSerializer(
            self.clinic,
            data={"logo_url": "https://assets.cdn.example.com/logo.png"},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    @override_settings(CLINIC_LOGO_ALLOWED_HOSTS=[])
    def test_rejects_external_logo_when_allowlist_empty(self):
        serializer = ClinicUpdateSerializer(
            self.clinic,
            data={"logo_url": "https://cdn.example.com/logo.png"},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("logo_url", serializer.errors)


class UpdateMeAPITest(TestCase):
    """API tests for PATCH /api/v1/auth/me/update/."""

    URL = "/api/v1/auth/me/update/"

    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Test Clinic", subdomain="test-clinic", discipline="siddha",
        )
        self.user = User.objects.create_user(
            username="testdoc",
            email="doc@test.com",
            password="OldSecure123!",
            first_name="Test",
            last_name="Doctor",
            clinic=self.clinic,
            role="doctor",
            is_clinic_owner=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_unauthenticated_denied(self):
        client = APIClient()
        response = client.patch(self.URL, {"first_name": "Hacker"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile_fields(self):
        response = self.client.patch(self.URL, {
            "first_name": "Updated",
            "last_name": "Name",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Updated")
        self.assertEqual(response.data["last_name"], "Name")

    def test_update_email_success(self):
        response = self.client.patch(self.URL, {"email": "newemail@test.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "newemail@test.com")

    def test_update_email_duplicate_rejected(self):
        User.objects.create_user(
            username="other", email="taken@test.com", password="Pass1234!",
            clinic=self.clinic, role="admin",
        )
        response = self.client.patch(self.URL, {"email": "taken@test.com"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_password_change_success(self):
        response = self.client.patch(self.URL, {
            "current_password": "OldSecure123!",
            "new_password": "NewSecure456!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecure456!"))

    def test_password_change_wrong_current(self):
        response = self.client.patch(self.URL, {
            "current_password": "WrongPassword",
            "new_password": "NewSecure456!",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.data)

    def test_password_change_missing_current(self):
        response = self.client.patch(self.URL, {"new_password": "NewSecure456!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.data)

    def test_password_change_rejects_common_password(self):
        response = self.client.patch(self.URL, {
            "current_password": "OldSecure123!",
            "new_password": "password",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)

    def test_password_change_rejects_numeric_only(self):
        response = self.client.patch(self.URL, {
            "current_password": "OldSecure123!",
            "new_password": "12345678",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)

    def test_password_change_rejects_too_short(self):
        response = self.client.patch(self.URL, {
            "current_password": "OldSecure123!",
            "new_password": "Ab1!",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)

    def test_response_includes_clinic(self):
        response = self.client.patch(self.URL, {"first_name": "Check"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("clinic", response.data)
        self.assertEqual(response.data["clinic"]["subdomain"], "test-clinic")


class UpdateClinicAPITest(TestCase):
    """API tests for PATCH /api/v1/auth/clinic/update/."""

    URL = "/api/v1/auth/clinic/update/"

    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Clinic A", subdomain="clinic-a", discipline="siddha",
        )
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@clinic.com",
            password="OwnerPass123!",
            clinic=self.clinic,
            role="doctor",
            is_clinic_owner=True,
        )
        self.member = User.objects.create_user(
            username="member",
            email="member@clinic.com",
            password="MemberPass123!",
            clinic=self.clinic,
            role="therapist",
            is_clinic_owner=False,
        )
        self.client = APIClient()

    def test_unauthenticated_denied(self):
        response = APIClient().patch(self.URL, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_owner_forbidden(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.patch(self.URL, {"name": "Renamed"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_updates_clinic_name(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self.URL, {"name": "Updated Clinic"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated Clinic")

    def test_owner_updates_multiple_fields(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self.URL, {
            "address": "123 Main St",
            "phone": "9876543210",
            "tagline": "Healing naturally",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["address"], "123 Main St")
        self.assertEqual(response.data["phone"], "9876543210")
        self.assertEqual(response.data["tagline"], "Healing naturally")

    @override_settings(CLINIC_LOGO_ALLOWED_HOSTS=["cdn.example.com"])
    def test_owner_rejects_disallowed_logo_url(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self.URL, {
            "logo_url": "https://evil.com/logo.png",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("logo_url", response.data)

    @override_settings(CLINIC_LOGO_ALLOWED_HOSTS=["cdn.example.com"])
    def test_owner_accepts_allowed_logo_url(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self.URL, {
            "logo_url": "https://cdn.example.com/logo.png",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["logo_url"], "https://cdn.example.com/logo.png")

    def test_response_schema(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(self.URL, {"name": "Schema Check"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ["id", "name", "subdomain", "discipline", "logo_url", "paper_size"]:
            self.assertIn(field, response.data)
