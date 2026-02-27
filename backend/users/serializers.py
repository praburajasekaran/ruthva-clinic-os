from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "is_clinic_owner",
        ]


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = [
            "id", "name", "subdomain", "discipline", "address", "phone",
            "email", "logo_url", "paper_size", "primary_color", "tagline",
            "active_patient_limit", "is_active", "created_at",
        ]
