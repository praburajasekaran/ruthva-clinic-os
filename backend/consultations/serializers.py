from rest_framework import serializers

from .models import Consultation


class ConsultationListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_record_id = serializers.CharField(
        source="patient.record_id", read_only=True
    )
    has_prescription = serializers.BooleanField(read_only=True)

    class Meta:
        model = Consultation
        fields = [
            "id", "patient", "patient_name", "patient_record_id",
            "consultation_date", "diagnosis", "has_prescription", "created_at",
        ]


class ConsultationDetailSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_record_id = serializers.CharField(
        source="patient.record_id", read_only=True
    )

    class Meta:
        model = Consultation
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate_patient(self, value):
        if self.instance and self.instance.patient != value:
            raise serializers.ValidationError(
                "Cannot reassign consultation to a different patient."
            )
        return value
