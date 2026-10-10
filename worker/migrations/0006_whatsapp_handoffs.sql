CREATE TABLE whatsapp_preferences (
  clinic_id INTEGER NOT NULL REFERENCES clinics_clinic(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients_patient(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('granted','opted_out')),
  recorded_by_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(clinic_id,patient_id)
);
CREATE TABLE whatsapp_handoffs (
  id TEXT PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics_clinic(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients_patient(id) ON DELETE CASCADE,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions_prescription(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('prescription','reminder')),
  version TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('prepared','handoff_requested','staff_reported_sent')),
  reviewed_by_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
  reported_by_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(clinic_id,prescription_id,kind,version)
);
CREATE TRIGGER whatsapp_preferences_tenant_insert BEFORE INSERT ON whatsapp_preferences
WHEN NEW.clinic_id<>(SELECT clinic_id FROM patients_patient WHERE id=NEW.patient_id)
  OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.recorded_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER whatsapp_preferences_tenant_update BEFORE UPDATE ON whatsapp_preferences
WHEN NEW.clinic_id<>(SELECT clinic_id FROM patients_patient WHERE id=NEW.patient_id)
  OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.recorded_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER whatsapp_handoffs_tenant_insert BEFORE INSERT ON whatsapp_handoffs
WHEN NEW.clinic_id<>(SELECT clinic_id FROM patients_patient WHERE id=NEW.patient_id)
  OR NEW.clinic_id<>(SELECT clinic_id FROM prescriptions_prescription WHERE id=NEW.prescription_id)
  OR NEW.patient_id<>(SELECT patient_id FROM consultations_consultation WHERE id=(SELECT consultation_id FROM prescriptions_prescription WHERE id=NEW.prescription_id))
  OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.reviewed_by_id)
  OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.reported_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
CREATE TRIGGER whatsapp_handoffs_tenant_update BEFORE UPDATE ON whatsapp_handoffs
WHEN NEW.clinic_id<>(SELECT clinic_id FROM patients_patient WHERE id=NEW.patient_id)
  OR NEW.clinic_id<>(SELECT clinic_id FROM prescriptions_prescription WHERE id=NEW.prescription_id)
  OR NEW.patient_id<>(SELECT patient_id FROM consultations_consultation WHERE id=(SELECT consultation_id FROM prescriptions_prescription WHERE id=NEW.prescription_id))
  OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.reviewed_by_id)
  OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.reported_by_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
