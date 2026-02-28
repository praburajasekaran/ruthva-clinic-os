from django.test import TestCase, override_settings

from clinics.models import Clinic
from users.serializers import ClinicUpdateSerializer


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
