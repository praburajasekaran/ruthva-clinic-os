from rest_framework import serializers

from .models import Medication, Prescription, ProcedureEntry


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            "id", "drug_name", "dosage", "frequency", "frequency_tamil",
            "duration", "instructions", "instructions_ta", "sort_order",
        ]


class ProcedureEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureEntry
        fields = ["id", "name", "details", "duration", "follow_up_date"]


class PrescriptionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="consultation.patient.name", read_only=True
    )
    patient_record_id = serializers.CharField(
        source="consultation.patient.record_id", read_only=True
    )
    consultation_date = serializers.DateField(
        source="consultation.consultation_date", read_only=True
    )
    medication_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id", "consultation", "patient_name", "patient_record_id",
            "consultation_date", "follow_up_date", "medication_count", "created_at",
        ]


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    medications = MedicationSerializer(many=True, required=False)
    procedures = ProcedureEntrySerializer(many=True, required=False)
    patient_name = serializers.CharField(
        source="consultation.patient.name", read_only=True
    )
    patient_record_id = serializers.CharField(
        source="consultation.patient.record_id", read_only=True
    )

    class Meta:
        model = Prescription
        fields = [
            "id", "consultation", "patient_name", "patient_record_id",
            "diet_advice", "diet_advice_ta",
            "lifestyle_advice", "lifestyle_advice_ta",
            "exercise_advice", "exercise_advice_ta",
            "follow_up_date", "follow_up_notes", "follow_up_notes_ta",
            "medications", "procedures",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_consultation(self, value):
        if self.instance and self.instance.consultation != value:
            raise serializers.ValidationError(
                "Cannot reassign prescription to a different consultation."
            )
        # Tenant FK validation: consultation must belong to same clinic
        request = self.context.get("request")
        if request and hasattr(request, "clinic") and request.clinic:
            if value.clinic_id != request.clinic.id:
                raise serializers.ValidationError("Consultation not found.")
        return value

    def create(self, validated_data):
        medications_data = validated_data.pop("medications", [])
        procedures_data = validated_data.pop("procedures", [])
        prescription = Prescription.objects.create(**validated_data)
        for med in medications_data:
            Medication.objects.create(prescription=prescription, **med)
        for proc in procedures_data:
            ProcedureEntry.objects.create(prescription=prescription, **proc)
        return prescription

    def update(self, instance, validated_data):
        medications_data = validated_data.pop("medications", None)
        procedures_data = validated_data.pop("procedures", None)
        instance = super().update(instance, validated_data)
        if medications_data is not None:
            instance.medications.all().delete()
            for med in medications_data:
                Medication.objects.create(prescription=instance, **med)
        if procedures_data is not None:
            instance.procedures.all().delete()
            for proc in procedures_data:
                ProcedureEntry.objects.create(prescription=instance, **proc)
        return instance
