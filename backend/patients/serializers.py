import re

from django.utils import timezone
from rest_framework import serializers

from .models import FamilyHistory, MedicalHistory, Patient


class MedicalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalHistory
        fields = ["id", "disease", "duration", "medication"]


class FamilyHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyHistory
        fields = ["id", "relation", "disease", "duration", "remarks"]


class PatientListSerializer(serializers.ModelSerializer):
    consultation_count = serializers.IntegerField(read_only=True)
    last_visit = serializers.DateField(read_only=True)
    calculated_age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id", "record_id", "name", "age", "date_of_birth",
            "calculated_age", "gender", "phone",
            "whatsapp_number", "consultation_count", "last_visit", "created_at",
        ]


class PatientDetailSerializer(serializers.ModelSerializer):
    medical_history = MedicalHistorySerializer(many=True, required=False)
    family_history = FamilyHistorySerializer(many=True, required=False)
    calculated_age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id", "record_id", "name", "age", "gender", "phone",
            "whatsapp_number", "email", "address", "blood_group",
            "occupation", "marital_status", "referred_by", "allergies",
            "food_habits", "activity_level", "menstrual_history",
            "number_of_children", "vaccination_records", "date_of_birth",
            "medical_history", "family_history",
            "created_at", "updated_at",
        ]
        read_only_fields = ["record_id", "created_at", "updated_at"]

    def validate_phone(self, value):
        if not re.match(r"^[6-9]\d{9}$", value):
            raise serializers.ValidationError(
                "Enter a valid 10-digit Indian mobile number starting with 6-9."
            )
        return value

    def validate_age(self, value):
        if value < 0 or value > 150:
            raise serializers.ValidationError("Age must be between 0 and 150.")
        return value

    def validate_date_of_birth(self, value):
        if value and value > timezone.now().date():
            raise serializers.ValidationError(
                "Date of birth cannot be in the future."
            )
        return value

    def create(self, validated_data):
        medical_history_data = validated_data.pop("medical_history", [])
        family_history_data = validated_data.pop("family_history", [])
        patient = Patient.objects.create(**validated_data)
        for mh in medical_history_data:
            MedicalHistory.objects.create(patient=patient, **mh)
        for fh in family_history_data:
            FamilyHistory.objects.create(patient=patient, **fh)
        return patient

    def update(self, instance, validated_data):
        medical_history_data = validated_data.pop("medical_history", None)
        family_history_data = validated_data.pop("family_history", None)
        instance = super().update(instance, validated_data)
        if medical_history_data is not None:
            instance.medical_history.all().delete()
            for mh in medical_history_data:
                MedicalHistory.objects.create(patient=instance, **mh)
        if family_history_data is not None:
            instance.family_history.all().delete()
            for fh in family_history_data:
                FamilyHistory.objects.create(patient=instance, **fh)
        return instance
