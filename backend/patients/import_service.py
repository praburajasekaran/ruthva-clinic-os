import csv
import io
from datetime import datetime

from django.db import transaction

from .models import Patient


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
        self.created_count = 0
        self.skipped_count = 0

    def validate_and_preview(self, file_content):
        """Parse CSV, validate, return preview of first 5 rows + error summary."""
        reader = csv.DictReader(io.StringIO(file_content))
        columns = set(reader.fieldnames or [])

        missing = self.REQUIRED_COLUMNS - columns
        if missing:
            return {"valid": False, "error": f"Missing columns: {', '.join(missing)}"}

        rows = []
        for i, row in enumerate(reader, start=2):  # row 1 is header
            validated = self._validate_row(row, i)
            rows.append(validated)

        errors = [r for r in rows if r.get("errors")]
        return {
            "valid": len(errors) == 0,
            "total_rows": len(rows),
            "error_count": len(errors),
            "preview": rows[:5],
            "errors": errors[:20],
        }

    @transaction.atomic
    def import_patients(self, file_content, skip_duplicates=True):
        """Import patients from validated CSV. All-or-nothing transaction."""
        reader = csv.DictReader(io.StringIO(file_content))

        for i, row in enumerate(reader, start=2):
            validated = self._validate_row(row, i)
            if validated.get("errors"):
                self.errors.append(validated)
                continue

            if skip_duplicates and Patient.objects.filter(
                clinic=self.clinic, phone=validated["data"]["phone"]
            ).exists():
                self.skipped_count += 1
                continue

            Patient.objects.create(clinic=self.clinic, **validated["data"])
            self.created_count += 1

        return {
            "created": self.created_count,
            "skipped": self.skipped_count,
            "errors": self.errors,
        }

    def _validate_row(self, row, line_number):
        """Validate a single CSV row."""
        errors = []
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
        data["phone"] = phone

        # Optional fields
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

        if errors:
            return {"line": line_number, "errors": errors, "raw": dict(row)}
        return {"line": line_number, "data": data, "errors": []}

    @staticmethod
    def _parse_date(date_str):
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d.%m.%Y"):
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        return None
