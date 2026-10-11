CREATE TABLE clinic_therapy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id INTEGER NOT NULL REFERENCES clinics_clinic(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 255)
);

CREATE UNIQUE INDEX clinic_therapy_unique_name
    ON clinic_therapy(clinic_id, lower(trim(name)));
