ALTER TABLE users_user ADD COLUMN email_verified_at TEXT;
ALTER TABLE users_user ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0 CHECK(session_version >= 0);

CREATE TABLE clinic_account_audit (
  id INTEGER PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics_clinic(id),
  actor_id INTEGER NOT NULL REFERENCES users_user(id),
  previous_active INTEGER NOT NULL CHECK(previous_active IN (0,1)),
  is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL
);
CREATE INDEX clinic_account_audit_clinic ON clinic_account_audit(clinic_id, created_at);
