CREATE TABLE contact_followup (
  id INTEGER PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics_clinic(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients_patient(id) ON DELETE CASCADE,
  prescription_id INTEGER REFERENCES prescriptions_prescription(id) ON DELETE SET NULL,
  created_by_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
  assigned_to_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
  request_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  contact_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','awaiting_doctor','completed')),
  revision INTEGER NOT NULL DEFAULT 0,
  last_event_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(clinic_id,request_id)
);
CREATE INDEX contact_followup_queue ON contact_followup(clinic_id,status,contact_date);
CREATE INDEX contact_followup_patient ON contact_followup(patient_id,created_at);
CREATE TABLE contact_followup_event (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES contact_followup(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('reached','no_answer','call_later','question','doctor_reply','reopen','assign')),
  note TEXT NOT NULL DEFAULT '',
  next_contact_date TEXT,
  assigned_to_id INTEGER REFERENCES users_user(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX contact_followup_event_task ON contact_followup_event(task_id,created_at);
CREATE TRIGGER contact_followup_tenant_insert BEFORE INSERT ON contact_followup
WHEN NEW.clinic_id<>(SELECT clinic_id FROM patients_patient WHERE id=NEW.patient_id)
OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.assigned_to_id)
OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.created_by_id)
OR (NEW.prescription_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM prescriptions_prescription r JOIN consultations_consultation c ON c.id=r.consultation_id WHERE r.id=NEW.prescription_id AND r.clinic_id=NEW.clinic_id AND c.patient_id=NEW.patient_id))
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic or patient'); END;
CREATE TRIGGER contact_followup_tenant_update BEFORE UPDATE ON contact_followup
WHEN NEW.clinic_id<>(SELECT clinic_id FROM patients_patient WHERE id=NEW.patient_id)
OR NEW.clinic_id<>(SELECT clinic_id FROM users_user WHERE id=NEW.assigned_to_id)
OR (NEW.prescription_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM prescriptions_prescription r JOIN consultations_consultation c ON c.id=r.consultation_id WHERE r.id=NEW.prescription_id AND r.clinic_id=NEW.clinic_id AND c.patient_id=NEW.patient_id))
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic or patient'); END;
CREATE TRIGGER contact_followup_event_tenant BEFORE INSERT ON contact_followup_event
WHEN (SELECT clinic_id FROM contact_followup WHERE id=NEW.task_id)<>(SELECT clinic_id FROM users_user WHERE id=NEW.actor_id)
OR (SELECT clinic_id FROM contact_followup WHERE id=NEW.task_id)<>(SELECT clinic_id FROM users_user WHERE id=NEW.assigned_to_id)
BEGIN SELECT RAISE(ABORT,'Related record belongs to another clinic'); END;
