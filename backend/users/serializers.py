from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from clinics.logo_security import is_logo_url_allowed
from clinics.models import Clinic

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["clinic_id"] = user.clinic_id
        token["clinic_slug"] = user.clinic.subdomain if user.clinic else None
        token["role"] = user.role
        return token

    def validate(self, attrs):
        # Allow login with email by resolving it to username
        username = attrs.get("username", "")
        if "@" in username:
            try:
                user = User.objects.get(email=username)
                attrs["username"] = user.username
            except User.DoesNotExist:
                pass  # Let super().validate() handle the auth failure
        data = super().validate(attrs)
        data["clinic_slug"] = (
            self.user.clinic.subdomain if self.user.clinic else None
        )
        return data


class ClinicSignupSerializer(serializers.Serializer):
    # Clinic fields
    clinic_name = serializers.CharField(max_length=255)
    subdomain = serializers.SlugField(max_length=63)
    discipline = serializers.ChoiceField(choices=Clinic.DISCIPLINE_CHOICES)
    # User fields
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, default="")

    def validate_subdomain(self, value):
        if Clinic.objects.filter(subdomain=value).exists():
            raise serializers.ValidationError("This subdomain is already taken.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        with transaction.atomic():
            clinic = Clinic.objects.create(
                name=validated_data["clinic_name"],
                subdomain=validated_data["subdomain"],
                discipline=validated_data["discipline"],
            )
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=validated_data["first_name"],
                last_name=validated_data.get("last_name", ""),
                clinic=clinic,
                role="doctor",
                is_clinic_owner=True,
            )
        return {"clinic": clinic, "user": user}


class PendingSignupSerializer(serializers.Serializer):
    """Validates signup initiation data (before OTP verification)."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, default="")
    email = serializers.EmailField()
    discipline = serializers.ChoiceField(choices=Clinic.DISCIPLINE_CHOICES)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email is already registered. Sign in instead?"
            )
        return value


class OnboardingSerializer(serializers.Serializer):
    """Validates clinic onboarding data (post-signup)."""

    clinic_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, default="")
    address = serializers.CharField()
    registration_number = serializers.CharField(max_length=50)
    discipline = serializers.ChoiceField(choices=Clinic.DISCIPLINE_CHOICES)

    def validate_clinic_name(self, value):
        base_slug = slugify(value)[:50]
        if not base_slug:
            raise serializers.ValidationError("Clinic name must contain valid characters.")
        return value

    def create(self, validated_data):
        user = self.context["user"]
        base_slug = slugify(validated_data["clinic_name"])[:50]
        subdomain = base_slug
        counter = 1
        while Clinic.objects.filter(subdomain=subdomain).exists():
            subdomain = f"{base_slug}-{counter}"
            counter += 1

        with transaction.atomic():
            clinic = Clinic.objects.create(
                name=validated_data["clinic_name"],
                subdomain=subdomain,
                discipline=validated_data["discipline"],
                phone=validated_data.get("phone", ""),
                address=validated_data["address"],
                registration_number=validated_data["registration_number"],
            )
            user.clinic = clinic
            user.save(update_fields=["clinic"])
        return clinic


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "is_clinic_owner",
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "current_password", "new_password"]

    def validate_email(self, value):
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_new_password(self, value):
        validate_password(value, self.instance)
        return value

    def validate(self, data):
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        if new_password and not current_password:
            raise serializers.ValidationError(
                {"current_password": "Current password is required to set a new one."}
            )
        if current_password and not self.instance.check_password(current_password):
            raise serializers.ValidationError(
                {"current_password": "Current password is incorrect."}
            )
        return data

    def update(self, instance, validated_data):
        validated_data.pop("current_password", None)
        new_password = validated_data.pop("new_password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if new_password:
            instance.set_password(new_password)
        instance.save()
        return instance


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = [
            "id", "name", "subdomain", "discipline", "address", "phone",
            "email", "logo_url", "paper_size", "primary_color", "tagline",
            "registration_number", "active_patient_limit", "is_active", "created_at",
        ]


class ClinicUpdateSerializer(serializers.ModelSerializer):
    def validate_logo_url(self, value):
        if not is_logo_url_allowed(value):
            raise serializers.ValidationError(
                "Logo URL must use HTTPS and a host from CLINIC_LOGO_ALLOWED_HOSTS."
            )
        return value

    class Meta:
        model = Clinic
        fields = [
            "name", "address", "phone", "email", "tagline",
            "paper_size", "logo_url", "primary_color",
        ]
