import csv
import io
import logging
from datetime import date, datetime

from django.db import IntegrityError, transaction

from .models import Patient

logger = logging.getLogger(__name__)


class PatientImportService:
    REQUIRED_COLUMNS = {"name", "age", "gender", "phone"}
    GENDER_MAP = {
        "m": "male", "male": "male",
        "f": "female", "female": "female",
        "o": "other", "other": "other",
    }

    def __init__(self, clinic):
        self.clinic = clinic
        self.errors = []
        self.warnings = []
        self.created_count = 0
        self.skipped_count = 0
        self.consultation_created_count = 0
        self.patients_for_ruthva = []

    def validate_and_preview(self, file_content):
        """Parse CSV, validate, return preview of first 5 rows + error summary."""
        reader = csv.DictReader(io.StringIO(file_content))
        columns = set(reader.fieldnames or [])

        missing = self.REQUIRED_COLUMNS - columns
        if missing:
            return {"valid": False, "error": f"Missing columns: {', '.join(missing)}"}

        rows = []
        seen_phones = set()
        for i, row in enumerate(reader, start=2):  # row 1 is header
            validated = self._validate_row(row, i, seen_phones)
            rows.append(validated)

        errors = [r for r in rows if r.get("errors")]
        warnings = [r for r in rows if r.get("warnings")]
        return {
            "valid": len(errors) == 0,
            "total_rows": len(rows),
            "error_count": len(errors),
            "warning_count": len(warnings),
            "preview": rows[:10],
            "errors": errors[:20],
            "warnings": warnings[:20],
        }

    @transaction.atomic
    def import_patients(self, file_content, skip_duplicates=True, user=None):
        """Import patients from validated CSV. All-or-nothing transaction."""
        from consultations.models import Consultation

        reader = csv.DictReader(io.StringIO(file_content))
        seen_phones = set()

        for i, row in enumerate(reader, start=2):
            validated = self._validate_row(row, i, seen_phones)
            if validated.get("errors"):
                self.errors.append(validated)
                continue

            patient_data = validated["data"]
            phone = patient_data["phone"]

            if skip_duplicates and Patient.objects.filter(
                clinic=self.clinic, phone=phone
            ).exists():
                self.skipped_count += 1
                continue

            # Extract non-Patient fields before creating
            diagnosis = patient_data.pop("_diagnosis", "")
            last_seen_date = patient_data.pop("_last_seen_date", None)
            next_review_date = patient_data.pop("_next_review_date", None)

            patient = Patient.objects.create(clinic=self.clinic, **patient_data)
            self.created_count += 1

            # Auto-create baseline consultation if diagnosis provided
            if diagnosis:
                consult_date = last_seen_date or date.today()
                try:
                    consultation = Consultation.objects.create(
                        clinic=self.clinic,
                        patient=patient,
                        conducted_by=user,
                        diagnosis=diagnosis,
                        consultation_date=consult_date,
                        is_imported=True,
                    )
                    self.consultation_created_count += 1
                except IntegrityError:
                    # UniqueConstraint: one consultation per patient per day
                    self.warnings.append(
                        f"Row {validated['line']}: consultation already exists for {consult_date}"
                    )
                    consultation = None
            else:
                consultation = None

            # Track patients with next_review_date for Ruthva sync
            if next_review_date:
                self.patients_for_ruthva.append(
                    (patient, consultation, next_review_date)
                )

        return {
            "created": self.created_count,
            "skipped": self.skipped_count,
            "consultation_created_count": self.consultation_created_count,
            "errors": self.errors,
            "warnings": self.warnings,
        }

    def sync_to_ruthva(self, user=None):
        """Sync imported patients to Ruthva. Non-blocking — failures are logged."""
        from django.conf import settings

        ruthva_url = getattr(settings, "RUTHVA_API_URL", "")
        if not ruthva_url or not self.patients_for_ruthva:
            return {"synced": 0, "failed": 0, "failed_patient_ids": []}

        from integrations.services import RuthvaService

        svc = RuthvaService()
        synced = 0
        failed = 0
        failed_patient_ids = []

        for patient, consultation, next_review_date in self.patients_for_ruthva:
            days_until_review = (next_review_date - date.today()).days
            followup_interval = max(days_until_review, 1)
            duration_days = followup_interval * 4

            ref, error = svc.start_journey(
                clinic=self.clinic,
                patient=patient,
                consultation=consultation,
                duration_days=duration_days,
                followup_interval_days=followup_interval,
            )
            if error:
                failed += 1
                failed_patient_ids.append(patient.id)
                logger.warning(
                    "Ruthva sync failed for patient %s: %s", patient.id, error
                )
            else:
                synced += 1

        return {
            "synced": synced,
            "failed": failed,
            "failed_patient_ids": failed_patient_ids,
        }

    def _validate_row(self, row, line_number, seen_phones=None):
        """Validate a single CSV row."""
        errors = []
        warnings = []
        data = {}

        name = (row.get("name") or "").strip()
        if not name:
            errors.append("name is required")
        data["name"] = name

        age_str = (row.get("age") or "").strip()
        try:
            data["age"] = int(age_str)
        except ValueError:
            errors.append("age must be a number")
            data["age"] = 0

        gender = self.GENDER_MAP.get((row.get("gender") or "").strip().lower())
        if not gender:
            errors.append("gender must be male/female/other")
        data["gender"] = gender or ""

        phone = (row.get("phone") or "").strip()
        if not phone:
            errors.append("phone is required")
        elif seen_phones is not None:
            if phone in seen_phones:
                errors.append("duplicate phone number in CSV")
            else:
                seen_phones.add(phone)
        data["phone"] = phone

        # Optional patient fields
        data["email"] = (row.get("email") or "").strip()
        data["address"] = (row.get("address") or "").strip()
        data["whatsapp_number"] = (row.get("whatsapp_number") or "").strip()
        data["blood_group"] = (row.get("blood_group") or "").strip().upper()
        data["occupation"] = (row.get("occupation") or "").strip()
        data["allergies"] = (row.get("allergies") or "").strip()
        data["food_habits"] = (row.get("food_habits") or "").strip().lower()

        dob = (row.get("date_of_birth") or "").strip()
        if dob:
            parsed = self._parse_date(dob)
            if parsed is None:
                errors.append("date_of_birth format not recognized")
            else:
                data["date_of_birth"] = parsed

        # New optional fields (stored with _ prefix, extracted during import)
        data["_diagnosis"] = (row.get("diagnosis") or "").strip()

        last_seen = (row.get("last_seen_date") or "").strip()
        if last_seen:
            parsed = self._parse_date(last_seen)
            if parsed is None:
                errors.append("last_seen_date format not recognized")
            elif parsed > date.today():
                errors.append("last_seen_date cannot be in the future")
            else:
                data["_last_seen_date"] = parsed
        else:
            data["_last_seen_date"] = None

        next_review = (row.get("next_review_date") or "").strip()
        if next_review:
            parsed = self._parse_date(next_review)
            if parsed is None:
                errors.append("next_review_date format not recognized")
            else:
                data["_next_review_date"] = parsed
                if parsed < date.today():
                    warnings.append("next_review_date is in the past")
        else:
            data["_next_review_date"] = None

        result = {"line": line_number, "data": data, "errors": errors}
        if warnings:
            result["warnings"] = warnings
        if errors:
            result["raw"] = dict(row)
        return result

    @staticmethod
    def _parse_date(date_str):
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d.%m.%Y"):
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        return None
