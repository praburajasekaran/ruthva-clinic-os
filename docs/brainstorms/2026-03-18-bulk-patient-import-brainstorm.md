# Bulk Patient Import & Management

**Date:** 2026-03-18
**Status:** Brainstorm complete
**Branch:** feat/bulk-patient-import

## What We're Building

A dedicated patient import page and bulk management capabilities for doctors who already have existing patients at their clinic. The goal is to save doctors time bringing their patient records into the system, rather than adding them one by one.

### MVP Scope

1. **Dedicated import page** (`/patients/import`) with multi-step flow: Upload CSV → Preview & Validate → Confirm Import
2. **Extended CSV fields** beyond current support:
   - Required: name, phone, age, gender (existing)
   - Optional existing: email, address, whatsapp_number, blood_group, occupation, allergies, food_habits, date_of_birth
   - **New**: `diagnosis`, `last_seen_date`, `next_review_date`
3. **Auto-create baseline consultation** from imported diagnosis + last_seen_date
4. **Bulk actions on Patients list page**: multi-select checkboxes with Delete and Toggle Active/Inactive
5. **Auto-sync to Ruthva** when clinic has integration enabled, using next_review_date to create journeys

### What's NOT in MVP

- Historical consultation/prescription import (too complex for CSV, low ROI)
- Column mapping wizard (use fixed CSV template instead)
- Bulk edit of patient fields (can be added later)

## Why This Approach

### Diagnosis as Baseline Consultation (not a Patient field)

Imported patients are existing patients — they already have at least one known diagnosis. Rather than adding a "notes" field to the Patient model:

- Auto-create a minimal Consultation record with `diagnosis` and `consultation_date` (from `last_seen_date` or import date)
- This keeps clinical data in the Consultation model where it belongs
- When the patient visits again, the doctor sees their baseline in the consultation history
- The consultation should be marked as imported (e.g., metadata flag) so it's clearly a baseline record, not a full clinical visit

### Dedicated Import Page (not Settings)

- Settings currently handles consultation/prescription import/export — this is different (patient-first)
- Doctors (not just owners) need access to import their patients
- A dedicated page allows a better UX with preview, validation, and error handling
- Future: could evolve into an onboarding wizard for new clinics

### Bulk Delete + Toggle Active (not just delete)

- Permanent deletion is dangerous for real patient data
- Toggle active/inactive provides a safe "archive" option
- Delete covers the "imported wrong data" recovery case
- Both require multi-select UI on the Patients list page

### Ruthva Auto-Sync

- Doctors importing patients want adherence tracking from day one
- `next_review_date` maps directly to Ruthva's journey `nextVisitDate`
- Uses existing integration API: `POST /api/integration/v1/journeys/start`
- Only triggers when clinic has Ruthva integration enabled
- Consent handling: import implies clinic-level consent (DPDP compliant via bulk consent flag)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where import lives | Dedicated `/patients/import` page | Better UX, doctor-accessible, not buried in Settings |
| Condition/diagnosis storage | Auto-create baseline Consultation | Keeps clinical data in the right model |
| CSV columns for condition | `diagnosis` + `last_seen_date` | Consultation needs a date; last_seen is the natural choice |
| Bulk actions | Delete + Toggle Active/Inactive | Safe archiving + error recovery |
| Ruthva sync | Auto-sync on import when enabled | Doctors want adherence tracking immediately |
| Historical consultations | Skip for MVP | Too complex for CSV, captured naturally on future visits |
| Permissions | Doctors + Owners | Core clinical workflow, not admin-only |
| Duplicate handling | Skip + warn in preview | Doctor updates existing patients from profile |
| Ruthva sync failure | Manual retry button | Import succeeds regardless; retry per-patient |
| Import size limit | Soft limit (no blocking) | Import all patients. Show upgrade nudge if over 200. 7-day grace period enforcement is a future billing feature. |

## Technical Notes

### Existing Infrastructure to Leverage

- `PatientImportService` in `backend/patients/import_service.py` — two-phase preview/confirm pattern
- API endpoints: `POST /api/v1/patients/import/preview/` and `/import/confirm/`
- Frontend types: `ImportPreviewResult`, `ImportConfirmResult`, `ImportPreviewRow`
- `FileUploadField` component with drag-and-drop styling
- `ImportPreviewTable` component for showing preview/error rows
- Phone validation: `^[6-9]\d{9}$` (Indian mobile)
- Duplicate detection: by phone number within clinic

### New Backend Work

- Extend `PatientImportService` to handle `diagnosis`, `last_seen_date`, `next_review_date`
- Auto-create Consultation records during import (within same atomic transaction)
- Bulk delete/toggle endpoints on `PatientViewSet`
- Ruthva integration call during import confirm (async/background if possible)

### New Frontend Work

- `/patients/import` page with stepper UI (Upload → Preview → Confirm)
- CSV template download button
- Enhanced preview table showing new columns
- Bulk select UI on Patients list (checkboxes, action bar)
- Bulk action confirmation modals

### Ruthva Integration Details

- Endpoint: `POST {RUTHVA_URL}/api/integration/v1/journeys/start`
- Auth: `X-Ruthva-Secret` header
- Payload per patient: name, phone, consentTimestamp, consentMethod ("bulk_import"), consentCapturedBy, followupIntervalDays (derived from next_review_date), duration
- Error handling: log failures, don't block import. Show sync status per patient in results.
- On failure: show manual "Retry Ruthva Sync" button on import results page for failed patients
- Trust window: activated for all imported patients (7-day grace period)

## Resolved Questions

1. **Permissions**: Doctors + Owners can import. This is a core clinical workflow, not admin-only.
2. **Duplicate handling**: Skip duplicates (by phone), show as warning in preview. Doctor updates existing patients from their profile.
3. **Ruthva sync failure**: Import succeeds regardless. Show sync status per patient. Manual "Retry Sync" button for failed patients.

## Resolved Questions

4. **Import size limit**: No blocking. Import all patients freely. Show upgrade nudge notification if clinic exceeds 200. Grace period enforcement (7 days) is a separate billing feature — not in this MVP.

## Open Questions

None — all questions resolved.
