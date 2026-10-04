import importlib.util
import base64
import hashlib
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("cloudflare_data", ROOT / "scripts/cloudflare-data.py")
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)
PASSWORD = "pbkdf2_sha256$720000$salt$" + base64.b64encode(hashlib.pbkdf2_hmac("sha256", b"SourcePassword123", b"salt", 720000)).decode()


def fixture(table, pk, **values):
    fields = {}
    for name, field in migration.SHAPE[table]["fields"].items():
        if name == "id":
            continue
        if name in values:
            value = values[name]
        elif field["default"] is not None:
            value = field["default"]
        elif field["nullable"]:
            value = None
        elif field["factory"] == "now":
            value = "2026-10-03T10:00:00.123456+05:30"
        elif field["type"] == "JSONField":
            value = {}
        elif field["type"] == "UUIDField":
            value = "01234567-89ab-cdef-0123-456789abcdef"
        elif "Integer" in field["type"] or field["target"]:
            value = 0
        elif field["type"] == "BooleanField":
            value = False
        elif field["type"] == "DateTimeField":
            value = "2026-10-03T10:00:00.123456+05:30"
        else:
            value = ""
        fields[name] = value
    return {"model": table.replace("_", ".", 1), "pk": pk, "fields": fields}


class DataMigrationTest(unittest.TestCase):
    def records(self):
        return [
            fixture("patients_patient", 21, clinic=1, record_id="PAT-2024-0021", name="தமிழ் O'Connor", age=31, gender="female", phone="9876543210", is_active=True),
            fixture("patients_patient", 22, clinic=1, record_id="PAT-2024-0022", name="Existing over quota", age=40, gender="male", phone="9876543211", is_active=True),
            fixture("clinics_clinic", 1, name="Source Clinic", subdomain="source-clinic", discipline="siddha", active_patient_limit=1, logo_url="https://legacy.example/logos/1/logo.png"),
            fixture("users_user", 11, clinic=1, username="source-doctor", email="doctor@example.test", password=PASSWORD, first_name="Doctor", is_clinic_owner=True, date_joined="2024-01-01T00:00:00Z"),
            fixture("consultations_consultation", 31, clinic=1, patient=21, conducted_by=11, consultation_date="2024-01-01", diagnostic_data={"envagai_thervu": {"naadi": "வாதம்"}}, diagnosis="Pain"),
            fixture("prescriptions_prescription", 41, clinic=1, consultation=31, follow_up_date="2024-02-01", diet_advice_ta="கீரை"),
            fixture("pharmacy_medicine", 51, clinic=1, name="Tablet", unit_price="12.30", current_stock=7),
            fixture("prescriptions_medication", 61, prescription=41, medicine=51, drug_name="Tablet", instructions_ta="உணவுக்குப் பின்"),
            fixture("clinics_clinicinvitation", 71, clinic=1, invited_by=11, email="therapist@example.test", first_name="Therapist", role="therapist", expires_at="2026-10-10T00:00:00Z"),
            fixture("feedback_feedback", 81, clinic=1, user=11, title="Test", category="bug", screenshot_url="https://legacy.example/feedback/source.png"),
        ]

    def test_preserves_records_passwords_timestamps_and_media_mapping(self):
        with tempfile.TemporaryDirectory() as name:
            directory = Path(name)
            source = directory / "fixture.json"
            source.write_text(json.dumps(self.records(), ensure_ascii=False))
            output = directory / "converted"
            manifest = migration.convert(source, output, "https://clinic.example")
            self.assertEqual(sum(x["count"] for x in manifest["tables"].values()), 10)
            db = migration.empty_database()
            db.executescript((output / "data.sql").read_text())
            self.assertEqual(db.execute("SELECT name,record_id FROM patients_patient WHERE id=21").fetchone(), ("தமிழ் O'Connor", "PAT-2024-0021"))
            self.assertEqual(db.execute("SELECT password FROM users_user WHERE id=11").fetchone()[0], PASSWORD)
            self.assertEqual(db.execute("SELECT email_verified_at,session_version FROM users_user WHERE id=11").fetchone(), (None, 0))
            self.assertEqual(db.execute("SELECT created_at FROM patients_patient WHERE id=21").fetchone()[0], "2026-10-03T04:30:00.123456Z")
            self.assertEqual(db.execute("SELECT active_patient_limit FROM clinics_clinic WHERE id=1").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT unit_price FROM pharmacy_medicine WHERE id=51").fetchone()[0], 12.3)
            self.assertEqual(db.execute("SELECT token FROM clinics_clinicinvitation WHERE id=71").fetchone()[0], "0123456789abcdef0123456789abcdef")
            self.assertEqual(len(json.loads((output / "media.json").read_text())), 2)
            snapshot = directory / "restored.sql"
            snapshot.write_text("\n".join(db.iterdump()))
            migration.verify(snapshot, output / "manifest.json")
            db.execute("UPDATE patients_patient SET name='Corrupted' WHERE id=21")
            snapshot.write_text("\n".join(db.iterdump()))
            with self.assertRaisesRegex(ValueError, "mismatch"):
                migration.verify(snapshot, output / "manifest.json")
            with self.assertRaisesRegex(ValueError, "empty output"):
                migration.convert(source, output, "https://clinic.example")
            db.close()

    def test_rejects_duplicate_emails_missing_foreign_keys_and_cross_clinic_data(self):
        for case in ("duplicate", "foreign-key", "tenant"):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as name:
                records = self.records()
                if case == "duplicate":
                    records.append(fixture("users_user", 12, clinic=1, username="second", email="DOCTOR@example.test", password="!", date_joined="2024-01-01T00:00:00Z"))
                elif case == "foreign-key":
                    records[0]["fields"]["clinic"] = 999
                else:
                    records.append(fixture("clinics_clinic", 2, name="Other", subdomain="other"))
                    records[4]["fields"]["clinic"] = 2
                source = Path(name) / "fixture.json"
                source.write_text(json.dumps(records))
                with self.assertRaises((sqlite3.Error, ValueError)):
                    migration.convert(source, Path(name) / "output", "https://clinic.example")
                self.assertFalse((Path(name) / "output/data.sql").exists())

    def test_rejects_hashes_the_runtime_cannot_verify(self):
        for value in ("argon2$unsupported", "pbkdf2_sha256$720000$salt$broken", PASSWORD.replace("$720000$", "$2000001$")):
            with self.subTest(password=value), tempfile.TemporaryDirectory() as name:
                records = self.records()
                records[3]["fields"]["password"] = value
                source = Path(name) / "fixture.json"
                source.write_text(json.dumps(records))
                with self.assertRaisesRegex(ValueError, "unsupported password"):
                    migration.convert(source, Path(name) / "output", "https://clinic.example")
                self.assertFalse((Path(name) / "output").exists())


if __name__ == "__main__":
    unittest.main()
