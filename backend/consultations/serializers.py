import sys

from rest_framework import serializers

from .models import Consultation

DISCIPLINE_SCHEMA_KEYS = {
    "siddha": "envagai_thervu",
    "ayurveda": "prakriti",
    "yoga_naturopathy": "notes",
    "unani": "notes",
    "homeopathy": "notes",
}

# Keys that must never appear in diagnostic_data (prototype pollution defense)
DENIED_KEYS = {"__proto__", "constructor", "prototype"}

MAX_DIAGNOSTIC_DATA_SIZE = 32_768  # 32KB
MAX_NESTING_DEPTH = 4


def _validate_diagnostic_structure(obj, depth=0):
    """Recursively validate JSON structure: depth limit + denied keys."""
    if depth > MAX_NESTING_DEPTH:
        raise serializers.ValidationError(
            f"diagnostic_data nesting too deep (max {MAX_NESTING_DEPTH} levels)."
        )
    if isinstance(obj, dict):
        if DENIED_KEYS & set(obj.keys()):
            raise serializers.ValidationError(
                "diagnostic_data contains disallowed keys."
            )
        for v in obj.values():
            _validate_diagnostic_structure(v, depth + 1)
    elif isinstance(obj, list):
        for item in obj:
            _validate_diagnostic_structure(item, depth + 1)


class ConsultationImportRowSerializer(serializers.Serializer):
    patient_phone = serializers.CharField(max_length=15)
    consultation_date = serializers.DateField(input_formats=["%Y-%m-%d"])
    chief_complaints = serializers.CharField(required=False, allow_blank=True)
    history_of_present_illness = serializers.CharField(required=False, allow_blank=True)
    diagnosis = serializers.CharField(required=False, allow_blank=True)
    assessment = serializers.CharField(required=False, allow_blank=True)
    weight = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    height = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    bp_systolic = serializers.IntegerField(required=False, allow_null=True)
    bp_diastolic = serializers.IntegerField(required=False, allow_null=True)
    pulse_rate = serializers.IntegerField(required=False, allow_null=True)
    temperature = serializers.DecimalField(
        max_digits=4, decimal_places=1, required=False, allow_null=True
    )
    diagnostic_data = serializers.JSONField(required=False, default=dict)

    def validate(self, attrs):
        if not attrs.get("chief_complaints", "").strip():
            raise serializers.ValidationError(
                {"chief_complaints": "This field is required."}
            )
        if not attrs.get("diagnosis", "").strip():
            raise serializers.ValidationError({"diagnosis": "This field is required."})
        return attrs


class ConsultationListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_record_id = serializers.CharField(
        source="patient.record_id", read_only=True
    )
    has_prescription = serializers.BooleanField(read_only=True)

    class Meta:
        model = Consultation
        fields = [
            "id",
            "patient",
            "patient_name",
            "patient_record_id",
            "consultation_date",
            "diagnosis",
            "has_prescription",
            "created_at",
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
            "mental_state",
            # Discipline-specific diagnostics
            "diagnostic_data",
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

    def validate_diagnostic_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "diagnostic_data must be a JSON object."
            )

        # Payload size limit (SEC-5.1)
        if sys.getsizeof(str(value)) > MAX_DIAGNOSTIC_DATA_SIZE:
            raise serializers.ValidationError(
                "diagnostic_data exceeds maximum size (32KB)."
            )

        # Structure validation: denied keys + nesting depth (SEC-5.2)
        _validate_diagnostic_structure(value)

        if not value:
            return value

        # Discipline-specific top-level key validation
        request = self.context.get("request")
        if request and hasattr(request, "clinic") and request.clinic:
            discipline = request.clinic.discipline
            expected_key = DISCIPLINE_SCHEMA_KEYS.get(discipline)
            if expected_key:
                unexpected = set(value.keys()) - {expected_key}
                if unexpected:
                    raise serializers.ValidationError(
                        f"Unexpected keys for {discipline}: {unexpected}. "
                        f"Expected: '{expected_key}'."
                    )

        return value
