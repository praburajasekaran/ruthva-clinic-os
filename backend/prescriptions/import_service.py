import csv
import io
from collections import defaultdict

from django.db import IntegrityError, transaction

from consultations.models import Consultation
from patients.models import Patient

from .models import Medication, Prescription, ProcedureEntry
from .serializers import PrescriptionImportRowSerializer


class PrescriptionImportService:
    REQUIRED_COLUMNS = {
        "patient_phone",
        "consultation_date",
        "row_type",
    }
    PARENT_FIELDS = [
        "diet_advice",
        "lifestyle_advice",
        "exercise_advice",
        "follow_up_date",
        "follow_up_notes",
    ]

    def __init__(self, clinic):
        self.clinic = clinic

    def validate_and_preview(self, file_content, skip_duplicates=True):
        grouped, rows, errors, missing_error = self._parse_and_validate(
            file_content=file_content,
            skip_duplicates=skip_duplicates,
        )
        if missing_error:
            return {"valid": False, "error": missing_error}

        return {
            "valid": len(errors) == 0,
            "total_rows": len(rows),
            "error_count": len(errors),
            "preview": rows[:5],
            "errors": errors[:20],
            "groups": len(grouped),
        }

    @transaction.atomic
    def import_prescriptions(self, file_content, skip_duplicates=True):
        grouped, _rows, errors, missing_error = self._parse_and_validate(
            file_content=file_content,
            skip_duplicates=skip_duplicates,
        )

        if missing_error:
            return {"created": 0, "skipped": 0, "errors": [{"line": 1, "errors": [missing_error]}]}

        if errors:
            return {"created": 0, "skipped": 0, "errors": errors}

        created = 0
        skipped = 0

        for group in grouped.values():
            consultation = group["consultation"]
            existing = Prescription.objects.filter(
                clinic=self.clinic,
                consultation=consultation,
            ).first()

            if existing:
                if skip_duplicates:
                    skipped += 1
                    continue
                errors.append({
                    "line": group["line_numbers"][0],
                    "errors": ["Duplicate prescription for consultation."],
                    "raw": {"consultation_id": consultation.id},
                })
                continue

            try:
                prescription = Prescription.objects.create(
                    clinic=self.clinic,
                    consultation=consultation,
                    **group["parent_data"],
                )
            except IntegrityError:
                if skip_duplicates:
                    skipped += 1
                    continue
                errors.append({
                    "line": group["line_numbers"][0],
                    "errors": ["Duplicate prescription for consultation."],
                    "raw": {"consultation_id": consultation.id},
                })
                transaction.set_rollback(True)
                break

            for med in group["medications"]:
                Medication.objects.create(prescription=prescription, **med)

            for proc in group["procedures"]:
                ProcedureEntry.objects.create(prescription=prescription, **proc)

            created += 1

        return {"created": created, "skipped": skipped, "errors": errors}

    def _parse_and_validate(self, file_content, skip_duplicates=True):
        reader = csv.DictReader(io.StringIO(file_content))
        columns = set(reader.fieldnames or [])

        missing = self.REQUIRED_COLUMNS - columns
        if missing:
            missing_text = ", ".join(sorted(missing))
            return {}, [], [], f"Missing columns: {missing_text}"

        errors = []
        rows = []
        grouped = defaultdict(
            lambda: {
                "consultation": None,
                "parent_data": {
                    "diet_advice": "",
                    "lifestyle_advice": "",
                    "exercise_advice": "",
                    "follow_up_date": None,
                    "follow_up_notes": "",
                },
                "medications": [],
                "procedures": [],
                "line_numbers": [],
            }
        )

        for line_number, row in enumerate(reader, start=2):
            raw = dict(row)
            serializer = PrescriptionImportRowSerializer(data=row)
            if not serializer.is_valid():
                errors.append({
                    "line": line_number,
                    "errors": self._flatten_serializer_errors(serializer.errors),
                    "raw": raw,
                })
                rows.append({"line": line_number, "errors": self._flatten_serializer_errors(serializer.errors), "raw": raw})
                continue

            data = dict(serializer.validated_data)
            patient_phone = data["patient_phone"]
            consultation_date = data["consultation_date"]

            patient = Patient.objects.filter(clinic=self.clinic, phone=patient_phone).first()
            if not patient:
                error = f"Patient with phone '{patient_phone}' not found in clinic."
                errors.append({"line": line_number, "errors": [error], "raw": raw})
                rows.append({"line": line_number, "errors": [error], "raw": raw})
                continue

            consultation = Consultation.objects.filter(
                clinic=self.clinic,
                patient=patient,
                consultation_date=consultation_date,
            ).first()
            if not consultation:
                error = "Consultation not found for patient and date. Import consultations first."
                errors.append({"line": line_number, "errors": [error], "raw": raw})
                rows.append({"line": line_number, "errors": [error], "raw": raw})
                continue

            existing_prescription = Prescription.objects.filter(
                clinic=self.clinic,
                consultation=consultation,
            ).exists()
            if existing_prescription and not skip_duplicates:
                error = "Duplicate prescription for consultation. Use skip_duplicates=true to skip."
                errors.append({"line": line_number, "errors": [error], "raw": raw})
                rows.append({"line": line_number, "errors": [error], "raw": raw})
                continue

            group_key = (patient_phone, consultation_date.isoformat())
            group = grouped[group_key]
            group["consultation"] = consultation
            group["line_numbers"].append(line_number)

            parent_update = {
                "diet_advice": data.get("diet_advice", "") or "",
                "lifestyle_advice": data.get("lifestyle_advice", "") or "",
                "exercise_advice": data.get("exercise_advice", "") or "",
                "follow_up_date": data.get("follow_up_date"),
                "follow_up_notes": data.get("follow_up_notes", "") or "",
            }
            parent_errors = self._merge_parent_data(group["parent_data"], parent_update)
            if parent_errors:
                errors.append({"line": line_number, "errors": parent_errors, "raw": raw})
                rows.append({"line": line_number, "errors": parent_errors, "raw": raw})
                continue

            row_type = data["row_type"]
            if row_type == "medication":
                med_errors = []
                for field in ["drug_name", "dosage", "frequency", "duration"]:
                    if not (data.get(field) or "").strip():
                        med_errors.append(f"{field} is required for medication rows.")
                if med_errors:
                    errors.append({"line": line_number, "errors": med_errors, "raw": raw})
                    rows.append({"line": line_number, "errors": med_errors, "raw": raw})
                    continue

                group["medications"].append({
                    "drug_name": data.get("drug_name", "").strip(),
                    "dosage": data.get("dosage", "").strip(),
                    "frequency": data.get("frequency", "").strip(),
                    "duration": data.get("duration", "").strip(),
                    "instructions": data.get("instructions", "").strip(),
                    "sort_order": data.get("sort_order") or 0,
                })
            else:
                procedure_name = (data.get("procedure_name") or "").strip()
                if not procedure_name:
                    proc_error = ["procedure_name is required for procedure rows."]
                    errors.append({"line": line_number, "errors": proc_error, "raw": raw})
                    rows.append({"line": line_number, "errors": proc_error, "raw": raw})
                    continue

                group["procedures"].append({
                    "name": procedure_name,
                    "details": (data.get("procedure_details") or "").strip(),
                    "duration": (data.get("procedure_duration") or "").strip(),
                    "follow_up_date": data.get("procedure_follow_up_date"),
                })

            rows.append({
                "line": line_number,
                "errors": [],
                "raw": raw,
                "group_key": f"{patient_phone}:{consultation_date.isoformat()}",
                "row_type": row_type,
            })

        return grouped, rows, errors, None

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

    def _merge_parent_data(self, current, new_values):
        errors = []
        for field in self.PARENT_FIELDS:
            existing = current.get(field)
            incoming = new_values.get(field)
            if self._is_empty(existing):
                current[field] = incoming
                continue
            if self._is_empty(incoming):
                continue
            if existing != incoming:
                errors.append(
                    f"Conflicting parent field '{field}' for grouped prescription rows."
                )
        return errors

    @staticmethod
    def _is_empty(value):
        return value in (None, "")
