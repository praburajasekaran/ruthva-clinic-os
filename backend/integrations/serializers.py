from rest_framework import serializers

from .models import RuthvaJourneyRef


class StartJourneySerializer(serializers.Serializer):
    """Validates the request to start a Ruthva treatment journey."""

    consultation_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Consultation ID to link this journey to",
    )
    patient_id = serializers.IntegerField(
        help_text="Sivanethram patient ID",
    )
    duration_days = serializers.IntegerField(min_value=7, max_value=180)
    followup_interval_days = serializers.IntegerField(min_value=1, max_value=30)
    consent_given = serializers.BooleanField()

    def validate_consent_given(self, value):
        if not value:
            raise serializers.ValidationError("Patient consent is required.")
        return value


class RuthvaJourneyRefSerializer(serializers.ModelSerializer):
    """Read-only serializer for journey reference data."""

    patient_name = serializers.CharField(source="patient.name", read_only=True)

    class Meta:
        model = RuthvaJourneyRef
        fields = [
            "id",
            "ruthva_journey_id",
            "ruthva_patient_id",
            "patient",
            "patient_name",
            "consultation",
            "status",
            "risk_level",
            "risk_reason",
            "start_date",
            "next_visit_date",
            "last_visit_date",
            "missed_visits",
            "recovery_attempts",
            "duration_days",
            "followup_interval_days",
            "last_synced_at",
            "created_at",
        ]
        read_only_fields = fields


class WebhookEventSerializer(serializers.Serializer):
    """Validates incoming webhook events from Ruthva."""

    event_type = serializers.ChoiceField(
        choices=[
            "risk_level_changed",
            "visit_missed",
            "journey_completed",
            "journey_dropped",
        ]
    )
    journey_id = serializers.CharField()
    event_id = serializers.CharField()
    timestamp = serializers.DateTimeField()
    data = serializers.DictField(required=False, default=dict)
