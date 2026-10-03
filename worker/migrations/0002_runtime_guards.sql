CREATE TABLE write_assertion (id INTEGER PRIMARY KEY CHECK(id=1), ok INTEGER NOT NULL CHECK(ok=1));
CREATE TABLE api_rate_limit (key TEXT NOT NULL, bucket INTEGER NOT NULL, hits INTEGER NOT NULL, PRIMARY KEY(key,bucket));
CREATE UNIQUE INDEX user_email_unique ON users_user(lower(email)) WHERE email<>'';
CREATE TRIGGER patient_limit_insert BEFORE INSERT ON patients_patient
WHEN NEW.is_active=1 AND (SELECT active_patient_limit FROM clinics_clinic WHERE id=NEW.clinic_id)>0
AND (SELECT count(*) FROM patients_patient WHERE clinic_id=NEW.clinic_id AND is_active=1)>=(SELECT active_patient_limit FROM clinics_clinic WHERE id=NEW.clinic_id)
BEGIN SELECT RAISE(ABORT,'Active patient limit reached'); END;
CREATE TRIGGER patient_limit_update BEFORE UPDATE OF is_active ON patients_patient
WHEN NEW.is_active=1 AND OLD.is_active=0 AND (SELECT active_patient_limit FROM clinics_clinic WHERE id=NEW.clinic_id)>0
AND (SELECT count(*) FROM patients_patient WHERE clinic_id=NEW.clinic_id AND is_active=1)>=(SELECT active_patient_limit FROM clinics_clinic WHERE id=NEW.clinic_id)
BEGIN SELECT RAISE(ABORT,'Active patient limit reached'); END;
CREATE TRIGGER consultation_clinic_insert BEFORE INSERT ON consultations_consultation
WHEN NEW.clinic_id<>(SELECT clinic_id FROM patients_patient WHERE id=NEW.patient_id)
BEGIN SELECT RAISE(ABORT,'Patient belongs to another clinic'); END;
CREATE TRIGGER prescription_clinic_insert BEFORE INSERT ON prescriptions_prescription
WHEN NEW.clinic_id<>(SELECT clinic_id FROM consultations_consultation WHERE id=NEW.consultation_id)
BEGIN SELECT RAISE(ABORT,'Consultation belongs to another clinic'); END;
CREATE TRIGGER dispensing_clinic_insert BEFORE INSERT ON pharmacy_dispensingitem
WHEN (SELECT clinic_id FROM pharmacy_medicine WHERE id=NEW.medicine_id)<>(SELECT clinic_id FROM pharmacy_dispensingrecord WHERE id=NEW.dispensing_record_id)
BEGIN SELECT RAISE(ABORT,'Medicine belongs to another clinic'); END;
