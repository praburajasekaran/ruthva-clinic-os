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
        fields = [
            "id", "patient", "patient_name", "patient_record_id",
            "conducted_by",
            # Vitals
            "weight", "height", "pulse_rate", "temperature",
            "bp_systolic", "bp_diastolic",
            # General Assessment
            "appetite", "appetite_notes", "bowel", "bowel_notes",
            "micturition", "micturition_notes", "sleep_quality", "sleep_notes",
            # Envagai Thervu
            "naa", "niram", "mozhi", "vizhi", "nadi", "mei",
            "muthiram", "varmam", "mental_state",
            # Diagnosis
            "chief_complaints", "history_of_present_illness",
            "diagnosis", "icd_code",
            "consultation_date", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "conducted_by"]

    def validate_patient(self, value):
        if self.instance and self.instance.patient != value:
            raise serializers.ValidationError(
                "Cannot reassign consultation to a different patient."
            )
        # Tenant FK validation: patient must belong to same clinic
        request = self.context.get("request")
        if request and hasattr(request, "clinic") and request.clinic:
            if value.clinic_id != request.clinic.id:
                raise serializers.ValidationError("Patient not found.")
        return value
