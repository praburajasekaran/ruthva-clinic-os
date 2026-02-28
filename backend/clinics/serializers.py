from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ClinicInvitation

User = get_user_model()


class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "is_clinic_owner", "date_joined",
        ]
        read_only_fields = ["id", "username", "email", "first_name", "last_name", "is_clinic_owner", "date_joined"]


class UpdateMemberRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, default="")
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)

    def validate_email(self, value):
        clinic = self.context["clinic"]
        # Check if user already belongs to this clinic
        if User.objects.filter(email=value, clinic=clinic).exists():
            raise serializers.ValidationError("This user is already a member of this clinic.")
        # Check if there's already a pending invite
        if ClinicInvitation.objects.filter(clinic=clinic, email=value, accepted_at__isnull=True).exists():
            raise serializers.ValidationError("An invitation has already been sent to this email.")
        return value


class InvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ClinicInvitation
        fields = [
            "id", "email", "first_name", "last_name", "role",
            "created_at", "expires_at", "accepted_at", "invited_by_name",
        ]
        read_only_fields = fields

    def get_invited_by_name(self, obj):
        return obj.invited_by.get_full_name() or obj.invited_by.username


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_token(self, value):
        try:
            invitation = ClinicInvitation.objects.select_related("clinic").get(
                token=value, accepted_at__isnull=True
            )
        except ClinicInvitation.DoesNotExist:
            raise serializers.ValidationError("Invalid or already used invitation.")
        if invitation.is_expired:
            raise serializers.ValidationError("This invitation has expired.")
        self._invitation = invitation
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    @property
    def invitation(self):
        return self._invitation
