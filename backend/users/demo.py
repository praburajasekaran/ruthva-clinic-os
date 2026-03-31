from functools import wraps

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.response import Response

from clinics.models import Clinic

User = get_user_model()

DEMO_EMAIL = "demo@ruthva.com"

DEMO_CLINICS = [
    {
        "subdomain": "demo-ayurveda",
        "name": "Dhanvantari Demo Clinic",
        "discipline": "ayurveda",
    },
    {
        "subdomain": "demo-siddha",
        "name": "Sivanethram Demo Clinic",
        "discipline": "siddha",
    },
    {
        "subdomain": "demo-homeopathy",
        "name": "Hahnemann Demo Clinic",
        "discipline": "homeopathy",
    },
]

DEFAULT_DEMO_SUBDOMAIN = "demo-ayurveda"


def is_demo_user(user):
    """Check if the given user is the demo account."""
    return user.is_authenticated and user.email == DEMO_EMAIL


def ensure_demo_setup():
    """Create demo user and all demo clinics if they don't exist. Idempotent."""
    with transaction.atomic():
        clinics = {}
        for clinic_data in DEMO_CLINICS:
            clinic, _ = Clinic.objects.get_or_create(
                subdomain=clinic_data["subdomain"],
                defaults={
                    "name": clinic_data["name"],
                    "discipline": clinic_data["discipline"],
                    "is_demo": True,
                    "is_active": True,
                },
            )
            clinics[clinic_data["subdomain"]] = clinic

        default_clinic = clinics[DEFAULT_DEMO_SUBDOMAIN]

        user, created = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={
                "username": "demo",
                "first_name": "Demo",
                "last_name": "Doctor",
                "role": "doctor",
                "is_clinic_owner": True,
                "clinic": default_clinic,
            },
        )
        if created:
            user.set_unusable_password()
            user.save()
        elif user.clinic is None:
            user.clinic = default_clinic
            user.save(update_fields=["clinic"])

        return user, clinics


def block_demo_user(view_func):
    """Return 403 for demo users on sensitive endpoints."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if is_demo_user(request.user):
            return Response(
                {"detail": "This action is not available in demo mode."},
                status=403,
            )
        return view_func(request, *args, **kwargs)

    return wrapper
