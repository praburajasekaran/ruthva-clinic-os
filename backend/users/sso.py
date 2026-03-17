"""SSO provision and validate views for Ruthva → Clinic-OS handoff."""

import hmac
import logging

import requests
from django.conf import settings
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers, status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from clinics.models import Clinic
from users.models import User
from users.serializers import CustomTokenObtainPairSerializer

logger = logging.getLogger(__name__)


# ─── Throttles ───────────────────────────────────────────────────────────────


class SsoExchangeThrottle(AnonRateThrottle):
    """Tight rate limit for the public SSO token exchange endpoint."""

    rate = "10/min"


def _verify_ruthva_secret(request):
    """Verify X-Ruthva-Secret header with timing-safe comparison."""
    received = request.META.get("HTTP_X_RUTHVA_SECRET", "")
    expected = getattr(settings, "RUTHVA_INTEGRATION_SECRET", "")
    if not received or not expected:
        return False
    return hmac.compare_digest(received.encode(), expected.encode())


# ─── Serializers ─────────────────────────────────────────────────────────────


class SsoProvisionSerializer(serializers.Serializer):
    email = serializers.EmailField()
    doctor_name = serializers.CharField(max_length=100)
    registration_number = serializers.CharField(max_length=50)
    clinic_name = serializers.CharField(max_length=255)
    clinic_address = serializers.CharField(max_length=500)
    whatsapp_number = serializers.CharField(max_length=15)
    discipline = serializers.ChoiceField(choices=Clinic.DISCIPLINE_CHOICES)
    ruthva_user_id = serializers.CharField(max_length=100)


class SsoValidateSerializer(serializers.Serializer):
    token = serializers.CharField()


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _generate_unique_subdomain(clinic_name):
    """Generate a unique subdomain from clinic name, appending suffix if taken."""
    base = slugify(clinic_name)[:55] or "clinic"
    candidate = base
    counter = 1
    while Clinic.objects.filter(subdomain=candidate).exists():
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate


# ─── Views ───────────────────────────────────────────────────────────────────


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def sso_provision(request):
    """
    Provision a clinic + owner user from Ruthva onboarding.
    Secured by X-Ruthva-Secret. Idempotent on ruthva_clinic_id.
    """
    if not _verify_ruthva_secret(request):
        return Response(
            {"detail": "Invalid or missing X-Ruthva-Secret."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    sz = SsoProvisionSerializer(data=request.data)
    sz.is_valid(raise_exception=True)
    data = sz.validated_data

    # Idempotency: if clinic already provisioned for this ruthva user, return it
    existing = Clinic.objects.filter(ruthva_clinic_id=data["ruthva_user_id"]).first()
    if existing:
        owner = existing.members.filter(is_clinic_owner=True).first()
        return Response(
            {
                "id": existing.id,
                "subdomain": existing.subdomain,
                "clinic_id": existing.id,
                "user_id": owner.id if owner else None,
            },
            status=status.HTTP_200_OK,
        )

    with transaction.atomic():
        subdomain = _generate_unique_subdomain(data["clinic_name"])

        clinic = Clinic.objects.create(
            name=data["clinic_name"],
            subdomain=subdomain,
            discipline=data["discipline"],
            address=data["clinic_address"],
            phone=data["whatsapp_number"],
            ruthva_clinic_id=data["ruthva_user_id"],
        )

        # Create owner user with unusable password (auth is via SSO)
        username = data["email"].split("@")[0]
        # Ensure unique username
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        name_parts = data["doctor_name"].split(" ", 1)
        user = User.objects.create_user(
            username=username,
            email=data["email"],
            first_name=name_parts[0],
            last_name=name_parts[1] if len(name_parts) > 1 else "",
            clinic=clinic,
            role="doctor",
            is_clinic_owner=True,
            registration_number=data["registration_number"],
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])

    return Response(
        {
            "id": clinic.id,
            "subdomain": clinic.subdomain,
            "clinic_id": clinic.id,
            "user_id": user.id,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([])
def sso_provision_rollback(request, clinic_id):
    """Rollback a provisioned clinic if Prisma creation fails on ruthva side."""
    if not _verify_ruthva_secret(request):
        return Response(
            {"detail": "Invalid or missing X-Ruthva-Secret."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        clinic = Clinic.objects.get(id=clinic_id)
        clinic.members.all().delete()
        clinic.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Clinic.DoesNotExist:
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
@throttle_classes([SsoExchangeThrottle])
def sso_exchange(request):
    """
    Public endpoint called by the clinic-os frontend to exchange an SSO token
    for a JWT pair. Internally calls ruthva /api/sso/validate with X-Ruthva-Secret
    to consume the one-time token. The token itself provides security (60s TTL,
    one-time use, 64-char hex with atomic consumption).
    """
    sz = SsoValidateSerializer(data=request.data)
    sz.is_valid(raise_exception=True)
    token = sz.validated_data["token"]

    # Call back to Ruthva to validate + consume the token
    ruthva_api_url = getattr(settings, "RUTHVA_API_URL", "")
    if not ruthva_api_url:
        logger.error("RUTHVA_API_URL not configured")
        return Response(
            {"detail": "SSO service not configured."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        resp = requests.post(
            f"{ruthva_api_url}/api/sso/validate",
            json={"token": token},
            headers={
                "X-Ruthva-Secret": getattr(settings, "RUTHVA_INTEGRATION_SECRET", ""),
                "Content-Type": "application/json",
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.exception("Failed to reach Ruthva for SSO validation: %s", exc)
        return Response(
            {"detail": "Could not validate SSO token."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if resp.status_code != 200:
        return Response(
            {"detail": "Invalid or expired SSO token."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    ruthva_data = resp.json()
    email = ruthva_data.get("email")

    if not email:
        return Response(
            {"detail": "Invalid token data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Find the Django user by email
    try:
        user = User.objects.select_related("clinic").get(email=email)
    except User.DoesNotExist:
        return Response(
            {"detail": "No account found. Please complete onboarding first."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Generate JWT pair
    token_pair = CustomTokenObtainPairSerializer.get_token(user)

    return Response(
        {
            "access": str(token_pair.access_token),
            "refresh": str(token_pair),
            "clinic_slug": user.clinic.subdomain if user.clinic else None,
        },
        status=status.HTTP_200_OK,
    )


class SsoDeactivateSerializer(serializers.Serializer):
    ruthva_user_id = serializers.CharField(max_length=100)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def sso_deactivate(request):
    """
    Deactivate a Django user when their Ruthva account is closed.
    Secured by X-Ruthva-Secret. Sets is_active=False on all users
    belonging to the clinic linked to the given ruthva_user_id.
    """
    if not _verify_ruthva_secret(request):
        return Response(
            {"detail": "Invalid or missing X-Ruthva-Secret."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    sz = SsoDeactivateSerializer(data=request.data)
    sz.is_valid(raise_exception=True)
    ruthva_user_id = sz.validated_data["ruthva_user_id"]

    try:
        clinic = Clinic.objects.get(ruthva_clinic_id=ruthva_user_id)
    except Clinic.DoesNotExist:
        # Nothing to deactivate — treat as success (idempotent)
        logger.warning(
            "sso_deactivate: no clinic found for ruthva_user_id=%s", ruthva_user_id
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    deactivated_count = clinic.members.filter(is_active=True).update(is_active=False)
    logger.info(
        "sso_deactivate: deactivated %d user(s) for clinic %s (ruthva_user_id=%s)",
        deactivated_count,
        clinic.id,
        ruthva_user_id,
    )

    return Response(
        {"deactivated_count": deactivated_count},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
def sso_usage(request):
    """Return patient count and limit for a clinic. Secured by X-Ruthva-Secret."""
    if not _verify_ruthva_secret(request):
        return Response(
            {"detail": "Invalid or missing X-Ruthva-Secret."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    ruthva_user_id = request.query_params.get("ruthva_user_id")
    if not ruthva_user_id:
        return Response(
            {"detail": "Missing ruthva_user_id parameter."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        clinic = Clinic.objects.get(ruthva_clinic_id=ruthva_user_id)
    except Clinic.DoesNotExist:
        return Response(
            {"detail": "Clinic not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    from patients.models import Patient

    patient_count = Patient.objects.filter(clinic=clinic).count()

    return Response(
        {
            "patient_count": patient_count,
            "patient_limit": clinic.active_patient_limit,
        },
        status=status.HTTP_200_OK,
    )
