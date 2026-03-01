import csv
import io
import json
from datetime import datetime

from django.db import IntegrityError, transaction

from patients.models import Patient

from .models import Consultation
from .serializers import (
    ConsultationImportRowSerializer,
    DISCIPLINE_SCHEMA_KEYS,
    _validate_diagnostic_structure,
)

MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024  # 2MB
MAX_IMPORT_ROW_COUNT = 5000
MAX_JSON_CELL_SIZE = 32_768  # 32KB per diagnostic_data cell


class ConsultationImportService:
    REQUIRED_COLUMNS = {
        "patient_phone",
        "consultation_date",
        "chief_complaints",
        "diagnosis",
    }

    def __init__(self, clinic, user=None):
        self.clinic = clinic
        self.user = user

    def validate_and_preview(self, file_content):
        if len(file_content.encode("utf-8") if isinstance(file_content, str) else file_content) > MAX_IMPORT_FILE_SIZE:
            return {"valid": False, "error": "File too large (max 2MB)."}

        reader = csv.DictReader(io.StringIO(file_content))
        columns = set(reader.fieldnames or [])

        missing = self.REQUIRED_COLUMNS - columns
        if missing:
            missing_text = ", ".join(sorted(missing))
            return {"valid": False, "error": f"Missing columns: {missing_text}"}

        rows = []
        for i, row in enumerate(reader, start=2):
            if i - 1 > MAX_IMPORT_ROW_COUNT:
                return {
                    "valid": False,
                    "error": f"Too many rows (max {MAX_IMPORT_ROW_COUNT}).",
                }
            rows.append(self._validate_row(row, i))

        errors = [self._serialize_row(row) for row in rows if row.get("errors")]
        preview = [self._serialize_row(row) for row in rows[:5]]
        return {
            "valid": len(errors) == 0,
            "total_rows": len(rows),
            "error_count": len(errors),
            "preview": preview,
            "errors": errors[:20],
        }

    @transaction.atomic
    def import_consultations(self, file_content, skip_duplicates=True):
        reader = csv.DictReader(io.StringIO(file_content))

        validated_rows = []
        errors = []

        for i, row in enumerate(reader, start=2):
            validated = self._validate_row(row, i)
            validated_rows.append(validated)
            if validated.get("errors"):
                errors.append(validated)

        if errors:
            return {"created": 0, "skipped": 0, "errors": errors}

        if not skip_duplicates:
            duplicate_errors = self._collect_duplicate_errors(validated_rows)
            if duplicate_errors:
                return {"created": 0, "skipped": 0, "errors": duplicate_errors}

        created_count = 0
        skipped_count = 0

        for row in validated_rows:
            data = row["data"]
            duplicate_qs = Consultation.objects.filter(
                clinic=self.clinic,
                patient=data["patient"],
                consultation_date=data["consultation_date"],
            )

            if duplicate_qs.exists():
                if skip_duplicates:
                    skipped_count += 1
                    continue
                errors.append({
                    "line": row["line"],
                    "errors": ["Duplicate consultation for patient and date."],
                    "raw": row.get("raw", {}),
                })
                continue

            try:
                Consultation.objects.create(
                    clinic=self.clinic,
                    conducted_by=self.user,
                    **data,
                )
                created_count += 1
            except IntegrityError:
                if skip_duplicates:
                    skipped_count += 1
                    continue
                errors.append({
                    "line": row["line"],
                    "errors": ["Duplicate consultation for patient and date."],
                    "raw": row.get("raw", {}),
                })
                if not skip_duplicates:
                    transaction.set_rollback(True)
                    break

        return {"created": created_count, "skipped": skipped_count, "errors": errors}

    def _validate_row(self, row, line_number):
        raw = dict(row)

        # Parse diagnostic_data JSON string before passing to serializer
        diag_raw = row.get("diagnostic_data", "").strip()
        if diag_raw:
            if len(diag_raw) > MAX_JSON_CELL_SIZE:
                return {
                    "line": line_number,
                    "errors": ["diagnostic_data too large (max 32KB)."],
                    "raw": raw,
                }
            try:
                parsed = json.loads(diag_raw)
            except (json.JSONDecodeError, TypeError):
                return {
                    "line": line_number,
                    "errors": ["Invalid JSON in diagnostic_data."],
                    "raw": raw,
                }

            if not isinstance(parsed, dict):
                return {
                    "line": line_number,
                    "errors": ["diagnostic_data must be a JSON object."],
                    "raw": raw,
                }

            # Structure validation: denied keys + nesting depth
            try:
                _validate_diagnostic_structure(parsed)
            except Exception as e:
                return {
                    "line": line_number,
                    "errors": [str(e.detail[0]) if hasattr(e, "detail") else str(e)],
                    "raw": raw,
                }

            # Discipline-specific top-level key validation
            if parsed:
                expected_key = DISCIPLINE_SCHEMA_KEYS.get(self.clinic.discipline)
                if expected_key:
                    unexpected = set(parsed.keys()) - {expected_key}
                    if unexpected:
                        return {
                            "line": line_number,
                            "errors": [
                                f"Unexpected keys in diagnostic_data for "
                                f"{self.clinic.discipline}: {unexpected}. "
                                f"Expected: '{expected_key}'."
                            ],
                            "raw": raw,
                        }

            row["diagnostic_data"] = parsed
        else:
            row.pop("diagnostic_data", None)

        serializer = ConsultationImportRowSerializer(data=row)
        if not serializer.is_valid():
            return {
                "line": line_number,
                "errors": self._flatten_serializer_errors(serializer.errors),
                "raw": raw,
            }

        data = dict(serializer.validated_data)
        patient_phone = data.pop("patient_phone")
        consultation_date = data.get("consultation_date")
        data.pop("assessment", None)

        patient = Patient.objects.filter(clinic=self.clinic, phone=patient_phone).first()
        if not patient:
            return {
                "line": line_number,
                "errors": [f"Patient with phone '{patient_phone}' not found in clinic."],
                "raw": raw,
            }

        data["patient"] = patient

        return {
            "line": line_number,
            "errors": [],
            "data": data,
            "raw": {
                **raw,
                "consultation_date": self._normalize_date(consultation_date),
            },
        }

    @staticmethod
    def _serialize_row(row):
        serialized = {
            "line": row["line"],
            "errors": row.get("errors", []),
            "raw": row.get("raw", {}),
        }
        if not row.get("errors") and "data" in row:
            data = row["data"]
            serialized["data"] = {
                key: (
                    value.id
                    if hasattr(value, "id")
                    else value.isoformat() if hasattr(value, "isoformat")
                    else value
                )
                for key, value in data.items()
            }
        return serialized

    def _collect_duplicate_errors(self, validated_rows):
        errors = []
        seen = {}
        for row in validated_rows:
            data = row["data"]
            key = (data["patient"].id, data["consultation_date"])
            if key in seen:
                errors.append({
                    "line": row["line"],
                    "errors": ["Duplicate consultation row in file for patient and date."],
                    "raw": row.get("raw", {}),
                })
                continue
            seen[key] = row["line"]

            if Consultation.objects.filter(
                clinic=self.clinic,
                patient=data["patient"],
                consultation_date=data["consultation_date"],
            ).exists():
                errors.append({
                    "line": row["line"],
                    "errors": ["Duplicate consultation for patient and date."],
                    "raw": row.get("raw", {}),
                })
        return errors

    @staticmethod
    def _flatten_serializer_errors(errors):
        flat = []
        for field, messages in errors.items():
            if isinstance(messages, (list, tuple)):
                for msg in messages:
                    flat.append(f"{field}: {msg}")
            else:
                flat.append(f"{field}: {messages}")
        return flat

    @staticmethod
    def _normalize_date(value):
        if value is None:
            return ""
        if hasattr(value, "isoformat"):
            return value.isoformat()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                return datetime.strptime(value, fmt).date().isoformat()
            except (TypeError, ValueError):
                continue
        return str(value)
