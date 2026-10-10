ALTER TABLE patients_patient ADD COLUMN allergies_review TEXT NOT NULL DEFAULT 'unknown' CHECK (allergies_review IN ('unknown','recorded','none'));
ALTER TABLE patients_patient ADD COLUMN medical_history_review TEXT NOT NULL DEFAULT 'unknown' CHECK (medical_history_review IN ('unknown','reviewed','none'));
ALTER TABLE patients_patient ADD COLUMN current_medicines_status TEXT NOT NULL DEFAULT 'unknown' CHECK (current_medicines_status IN ('unknown','taking','none'));
ALTER TABLE patients_patient ADD COLUMN current_medicines TEXT NOT NULL DEFAULT '';
CREATE TABLE patient_summary (
  patient_id INTEGER PRIMARY KEY REFERENCES patients_patient(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','ready','failed')),
  summary TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
