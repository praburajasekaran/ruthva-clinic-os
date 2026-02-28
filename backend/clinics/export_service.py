import csv
import io
import zipfile

from consultations.models import Consultation
from patients.models import Patient
from prescriptions.models import Prescription


class DataExportService:
    @staticmethod
    def export_patients_csv(clinic):
        headers = [
            "record_id",
            "name",
            "age",
            "gender",
            "phone",
            "whatsapp_number",
            "email",
            "address",
            "blood_group",
            "occupation",
            "allergies",
            "food_habits",
            "date_of_birth",
            "created_at",
        ]
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)

        row_count = 0
        queryset = Patient.objects.filter(clinic=clinic).order_by("id").iterator()
        for patient in queryset:
            writer.writerow([
                patient.record_id,
                patient.name,
                patient.age,
                patient.gender,
                patient.phone,
                patient.whatsapp_number,
                patient.email,
                patient.address,
                patient.blood_group,
                patient.occupation,
                patient.allergies,
                patient.food_habits,
                patient.date_of_birth.isoformat() if patient.date_of_birth else "",
                patient.created_at.isoformat(),
            ])
            row_count += 1

        return DataExportService._encode_csv(buffer), row_count

    @staticmethod
    def export_consultations_csv(clinic):
        headers = [
            "patient_record_id",
            "patient_phone",
            "consultation_date",
            "chief_complaints",
            "history_of_present_illness",
            "diagnosis",
            "weight",
            "height",
            "bp_systolic",
            "bp_diastolic",
            "pulse_rate",
            "temperature",
            "created_at",
        ]
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)

        row_count = 0
        queryset = (
            Consultation.objects.filter(clinic=clinic)
            .select_related("patient")
            .order_by("id")
            .iterator()
        )
        for consultation in queryset:
            writer.writerow([
                consultation.patient.record_id,
                consultation.patient.phone,
                consultation.consultation_date.isoformat(),
                consultation.chief_complaints,
                consultation.history_of_present_illness,
                consultation.diagnosis,
                consultation.weight,
                consultation.height,
                consultation.bp_systolic,
                consultation.bp_diastolic,
                consultation.pulse_rate,
                consultation.temperature,
                consultation.created_at.isoformat(),
            ])
            row_count += 1

        return DataExportService._encode_csv(buffer), row_count

    @staticmethod
    def export_prescriptions_csv(clinic):
        headers = [
            "patient_phone",
            "consultation_date",
            "diet_advice",
            "lifestyle_advice",
            "exercise_advice",
            "follow_up_date",
            "follow_up_notes",
            "row_type",
            "drug_name",
            "dosage",
            "frequency",
            "duration",
            "instructions",
            "sort_order",
            "procedure_name",
            "procedure_details",
            "procedure_duration",
            "procedure_follow_up_date",
            "created_at",
        ]
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)

        row_count = 0
        queryset = (
            Prescription.objects.filter(clinic=clinic)
            .select_related("consultation__patient")
            .prefetch_related("medications", "procedures")
            .order_by("id")
        )

        for prescription in queryset:
            base = [
                prescription.consultation.patient.phone,
                prescription.consultation.consultation_date.isoformat(),
                prescription.diet_advice,
                prescription.lifestyle_advice,
                prescription.exercise_advice,
                prescription.follow_up_date.isoformat() if prescription.follow_up_date else "",
                prescription.follow_up_notes,
            ]
            emitted = False

            for medication in prescription.medications.all():
                writer.writerow(base + [
                    "medication",
                    medication.drug_name,
                    medication.dosage,
                    medication.frequency,
                    medication.duration,
                    medication.instructions,
                    medication.sort_order,
                    "",
                    "",
                    "",
                    "",
                    prescription.created_at.isoformat(),
                ])
                row_count += 1
                emitted = True

            for procedure in prescription.procedures.all():
                writer.writerow(base + [
                    "procedure",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    procedure.name,
                    procedure.details,
                    procedure.duration,
                    procedure.follow_up_date.isoformat() if procedure.follow_up_date else "",
                    prescription.created_at.isoformat(),
                ])
                row_count += 1
                emitted = True

            if not emitted:
                writer.writerow(base + ["", "", "", "", "", "", "", "", "", "", "", prescription.created_at.isoformat()])
                row_count += 1

        return DataExportService._encode_csv(buffer), row_count

    @staticmethod
    def export_all_zip(clinic):
        patients_csv, patients_count = DataExportService.export_patients_csv(clinic)
        consultations_csv, consultations_count = DataExportService.export_consultations_csv(clinic)
        prescriptions_csv, prescriptions_count = DataExportService.export_prescriptions_csv(clinic)

        stream = io.BytesIO()
        with zipfile.ZipFile(stream, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("patients.csv", patients_csv)
            archive.writestr("consultations.csv", consultations_csv)
            archive.writestr("prescriptions.csv", prescriptions_csv)

        return stream.getvalue(), {
            "patients": patients_count,
            "consultations": consultations_count,
            "prescriptions": prescriptions_count,
            "total": patients_count + consultations_count + prescriptions_count,
        }

    @staticmethod
    def _encode_csv(buffer):
        return buffer.getvalue().encode("utf-8-sig")
