import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from clinics.models import Clinic

from .models import EmailOTP, PendingSignup
from .otp import generate_otp, hash_otp, send_otp_email, verify_otp_hash
from .serializers import (
    ClinicSerializer,
    ClinicSignupSerializer,
    ClinicUpdateSerializer,
    CustomTokenObtainPairSerializer,
    OnboardingSerializer,
    PendingSignupSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

logger = logging.getLogger(__name__)

User = get_user_model()


class OTPRequestThrottle(AnonRateThrottle):
    rate = "5/min"


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPRequestThrottle])
def request_otp(request):
    email = (request.data.get("email") or "").strip().lower()
    if not email:
        return Response(
            {"detail": "Email is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Always return success to avoid email enumeration
    if not User.objects.filter(email=email).exists():
        return Response({"detail": "If that email exists, a code has been sent."})

    # Invalidate previous OTPs for this email
    EmailOTP.objects.filter(email=email).delete()

    code = generate_otp()
    EmailOTP.objects.create(email=email, code_hash=hash_otp(code))

    try:
        send_otp_email(email, code)
    except Exception:
        logger.exception("Failed to send OTP email to %s", email)
        return Response(
            {"detail": "Failed to send email. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({"detail": "If that email exists, a code has been sent."})


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request):
    try:
        return _verify_otp_inner(request)
    except Exception:
        logger.exception("verify_otp UNHANDLED EXCEPTION")
        return Response(
            {"detail": "Verification failed. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _verify_otp_inner(request):
    email = (request.data.get("email") or "").strip().lower()
    code = (request.data.get("code") or "").strip()

    if not email or not code:
        return Response(
            {"detail": "Email and code are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    otp = EmailOTP.objects.filter(email=email).order_by("-created_at").first()

    if not otp:
        return Response(
            {"detail": "No verification code found. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if otp.is_locked:
        otp.delete()
        return Response(
            {"detail": "Too many attempts. Please request a new code."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if otp.is_expired:
        otp.delete()
        return Response(
            {"detail": "Code has expired. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not verify_otp_hash(code, otp.code_hash):
        try:
            from .otp import hash_otp as _dbg_hash
            computed = _dbg_hash(code)
            age = int((timezone.now() - otp.created_at).total_seconds())
            logger.error(
                "OTP MISMATCH email=%s code_len=%d stored=%s computed=%s attempts=%d age_sec=%d",
                email, len(code), otp.code_hash[:12], computed[:12],
                otp.attempts, age,
            )
        except Exception:
            logger.exception("OTP debug logging failed")
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        return Response(
            {"detail": "Invalid code. Please try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # OTP verified — clean up and issue JWT
    otp.delete()

    user = User.objects.filter(email=email).first()
    if not user:
        return Response(
            {"detail": "User not found."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token = CustomTokenObtainPairSerializer.get_token(user)
    return Response({
        "access": str(token.access_token),
        "refresh": str(token),
        "clinic_slug": user.clinic.subdomain if user.clinic else None,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = ClinicSignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = serializer.save()
    # Generate tokens for the new user
    token_serializer = CustomTokenObtainPairSerializer()
    token = token_serializer.get_token(result["user"])
    return Response(
        {
            "user": UserSerializer(result["user"]).data,
            "clinic": ClinicSerializer(result["clinic"]).data,
            "access": str(token.access_token),
            "refresh": str(token),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OTPRequestThrottle])
def initiate_signup(request):
    serializer = PendingSignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    email = data["email"]

    # Delete any existing pending signup for this email
    PendingSignup.objects.filter(email=email).delete()

    code = generate_otp()

    PendingSignup.objects.create(
        email=email,
        first_name=data["first_name"],
        last_name=data.get("last_name", ""),
        discipline=data["discipline"],
        otp_code_hash=hash_otp(code),
    )

    try:
        send_otp_email(email, code, purpose="signup")
    except Exception:
        logger.exception("Failed to send signup OTP email to %s", email)
        return Response(
            {"detail": "Failed to send email. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"detail": "Verification code sent to your email."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_signup_otp(request):
    email = (request.data.get("email") or "").strip().lower()
    code = (request.data.get("code") or "").strip()

    if not email or not code:
        return Response(
            {"detail": "Email and code are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pending = PendingSignup.objects.filter(email=email).first()
    if not pending:
        return Response(
            {"detail": "No pending signup found. Please start registration again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if pending.is_locked:
        pending.delete()
        return Response(
            {"detail": "Too many attempts. Please start registration again."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if pending.is_expired:
        pending.delete()
        return Response(
            {"detail": "Code has expired. Please start registration again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not verify_otp_hash(code, pending.otp_code_hash):
        pending.otp_attempts += 1
        pending.save(update_fields=["otp_attempts"])
        return Response(
            {"detail": "Invalid code. Please try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # OTP verified — create user account
    discipline = pending.discipline
    first_name = pending.first_name
    last_name = pending.last_name

    # Auto-generate username from email prefix
    base_username = email.split("@")[0][:140]
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    with transaction.atomic():
        user = User.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            clinic=None,
            role="doctor",
            is_clinic_owner=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        pending.delete()

    token = CustomTokenObtainPairSerializer.get_token(user)
    return Response(
        {
            "access": str(token.access_token),
            "refresh": str(token),
            "discipline": discipline,
            "onboarding_required": True,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_onboarding(request):
    user = request.user
    if user.clinic is not None:
        return Response(
            {"detail": "Onboarding already completed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = OnboardingSerializer(
        data=request.data, context={"user": user}
    )
    serializer.is_valid(raise_exception=True)
    clinic = serializer.save()

    token = CustomTokenObtainPairSerializer.get_token(user)
    return Response(
        {
            "clinic": ClinicSerializer(clinic).data,
            "access": str(token.access_token),
            "refresh": str(token),
            "onboarding_complete": True,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def check_availability(request):
    field = request.data.get("field")
    value = request.data.get("value", "").strip()

    if field not in ("username", "email", "subdomain") or not value:
        return Response(
            {"error": "Invalid request"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if field == "subdomain":
        taken = Clinic.objects.filter(subdomain=value).exists()
    else:
        taken = User.objects.filter(**{field: value}).exists()

    return Response({"available": not taken})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    data = UserSerializer(request.user).data
    data["clinic"] = (
        ClinicSerializer(request.user.clinic).data if request.user.clinic else None
    )
    data["onboarding_complete"] = request.user.clinic_id is not None
    return Response(data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_me(request):
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    data = UserSerializer(user).data
    data["clinic"] = (
        ClinicSerializer(user.clinic).data if user.clinic else None
    )
    return Response(data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_clinic(request):
    clinic = request.user.clinic
    if not clinic or not request.user.is_clinic_owner:
        return Response(
            {"detail": "Only clinic owners can update clinic settings."},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = ClinicUpdateSerializer(clinic, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(ClinicSerializer(clinic).data)
