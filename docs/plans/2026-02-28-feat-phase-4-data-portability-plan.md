---
title: "feat: Phase 4 Data Portability (Consultation/Prescription Import + Full Export)"
type: feat
status: active
date: 2026-02-28
origin: docs/plans/2026-02-27-saas-multi-tenant-brainstorm.md
---

# feat: Phase 4 Data Portability (Consultation/Prescription Import + Full Export)

## ✨ Overview

Deliver Phase 4 "Data Portability" so clinics can:
1. Import consultations and prescriptions with a safe preview → confirm workflow.
2. Export all tenant data as per-entity CSVs and a ZIP bundle.

This plan extends the existing Phase 1 patient CSV import foundation instead of introducing a second import architecture.

## Problem Statement / Motivation

Phase 1 only supports patient CSV import (`backend/patients/import_service.py`). Clinics migrating from existing systems still need bulk import/export for:
- consultations,
- prescriptions (including medication/procedure rows),
- full clinic backup portability.

Without this, onboarding is incomplete for established clinics and data lock-in risk remains high.

## Proposed Solution

Use a consistent, tenant-safe import/export framework across entities:
- Extend current import pattern (preview + confirm + transactional write).
- Enforce dependency order: `patients -> consultations -> prescriptions`.
- Provide CSV export endpoints for each entity and one ZIP endpoint for all exports.
- Defer direct Google Sheets OAuth integration for this phase; keep CSV-first path (aligned with brainstorm and requirements).

(see brainstorm: `docs/plans/2026-02-27-saas-multi-tenant-brainstorm.md`)

## Scope

### In Scope (Phase 4)

- Consultation CSV preview/confirm endpoints.
- Prescription CSV preview/confirm endpoints.
- Medication/procedure row parsing strategy for prescription imports.
- CSV export endpoints for patients/consultations/prescriptions.
- ZIP export endpoint bundling all CSVs.
- Frontend import/export UI entry points in dashboard area.
- Validation and integration tests for import ordering and tenant isolation.

### Out of Scope (Phase 4)

- Google Sheets OAuth-based import (deferred).
- Cross-tenant or admin-level global export endpoints.
- Major model redesign for multi-discipline (Phase 5).

## Technical Considerations

- Reuse existing tenant isolation primitives:
  - `TenantMiddleware` (`backend/clinics/middleware.py`)
  - `TenantQuerySetMixin` (`backend/clinics/mixins.py`)
- Keep import writes atomic per confirm request.
- **Confirm policy (explicit):** confirm is fail-fast all-or-nothing for validation errors; only rows identified as duplicates may be skipped when `skip_duplicates=true`.
- Keep serializer/model validation as source of truth for field constraints.
- Preserve idempotence behavior via duplicate keys where possible:
  - consultations: `(clinic, patient, consultation_date)`
  - prescriptions: `(clinic, consultation)` with row-level medication merge strategy.
- Use streaming/chunked iteration for large exports (`iterator()` style).
- Enforce idempotence at DB layer:
  - add unique constraint for consultations on `(clinic, patient, consultation_date)` via migration.
  - preserve one-to-one uniqueness of prescription-per-consultation at DB level.

## System-Wide Impact

- **Interaction graph**: Import endpoints create `Consultation` and `Prescription` records, which affect dashboard metrics (`/api/v1/dashboard/stats/`) and follow-up listing (`/api/v1/dashboard/follow-ups/`).
- **Error propagation**: CSV parse/validation errors should return deterministic line-level messages from import services to DRF actions to frontend tables.
- **State lifecycle risks**: Partial writes are prevented by transactional confirm flow. Validation failures roll back the entire request; duplicate rows are the only allowed skips when enabled.
- **API surface parity**: Existing `patients/import/preview` and `patients/import/confirm` are canonical; new endpoints should mirror naming and response structure.
- **Authorization and audit**: export endpoints are owner/admin-only, throttled, and write audit events (actor, clinic, endpoint, row_count, timestamp).
- **Integration test scenarios**:
  - import prescriptions before consultations should fail with actionable errors,
  - duplicate consultation rows should be skipped or rejected consistently,
  - ZIP export contains all expected CSV files and only tenant-owned rows.

## SpecFlow Analysis (Flow Gaps and Edge Cases)

1. **Dependency failure path**: User imports prescriptions first. System must reject and explain missing consultation references.
2. **Mixed-validity file**: Some rows invalid. Preview shows exact failing lines and reasons; confirm behavior must match defined policy.
3. **Duplicate strategy clarity**: Must explicitly define `skip_duplicates` semantics for consultations/prescriptions, not just patients.
4. **Large file handling**: Prevent request timeout or memory blowups for large CSV/ZIP operations.
5. **Tenant-bound references**: Imported foreign keys (patient phone, consultation lookup fields) must resolve only inside `request.clinic`.
6. **Bulk export abuse path**: Non-owner members or scripted clients repeatedly downloading bulk ZIP must be blocked/throttled and auditable.

## Implementation Plan

### Phase A: Backend Import Services

- [x] `backend/consultations/import_service.py`: add `ConsultationImportService` with `validate_and_preview()` + `import_consultations()`.
- [x] `backend/prescriptions/import_service.py`: add `PrescriptionImportService` with canonical row parsing strategy (defined below).
- [x] `backend/consultations/views.py`: add `@action(detail=False, methods=["post"], url_path="import/preview")` and `import/confirm`.
- [x] `backend/prescriptions/views.py`: add matching import actions.
- [x] `backend/consultations/serializers.py`: add import-row serializer for row-level validation.
- [x] `backend/prescriptions/serializers.py`: add import-row serializer and nested medication/procedure validation.
- [x] `backend/consultations/models.py`: add DB unique constraint on `(clinic, patient, consultation_date)` and migration.

### Phase B: Backend Export Services + Endpoints

- [x] `backend/clinics/export_service.py`: implement CSV builders for patients, consultations, prescriptions and ZIP assembler.
- [x] `backend/config/views.py`: add export views guarded by `IsClinicOwner` (or explicit owner/admin policy), throttling, and audit logging.
- [x] `backend/config/urls.py`: route export endpoints:
  - `GET /api/v1/export/patients/`
  - `GET /api/v1/export/consultations/`
  - `GET /api/v1/export/prescriptions/`
  - `GET /api/v1/export/all/`
- [x] `backend/clinics/models.py` (or dedicated audit model file): add `DataExportAudit` model if not already available.

### Phase C: Frontend UX

- [x] `frontend/src/app/(dashboard)/settings/page.tsx` (or dedicated import-export page): add import/export section.
- [x] `frontend/src/components/.../ImportPreviewTable.tsx`: reusable preview table with error rows.
- [x] `frontend/src/lib/api.ts`: add typed API helpers for new import/export endpoints.
- [x] `frontend/src/lib/types.ts`: add import preview/result and export response types.

### Phase D: Testing + Hardening

- [x] `backend/consultations/tests.py`: import preview/confirm success and failure tests.
- [x] `backend/prescriptions/tests.py`: import ordering and duplicate handling tests.
- [x] `backend/patients/tests.py`: compatibility checks so existing patient import contract remains unchanged.
- [x] `backend/clinics/tests.py`: tenant isolation tests for export endpoints.
- [x] `backend/config/tests.py` (or `backend/clinics/tests.py`): export permission, throttling, and audit-event tests.
- [ ] `frontend` tests/e2e: upload CSV, preview errors, confirm import, export ZIP download flow.

## Canonical CSV Contracts (Implementation Gate)

### Consultations Import CSV

Required columns:
- `patient_phone`
- `consultation_date` (ISO `YYYY-MM-DD`)
- `chief_complaints`
- `diagnosis`

Optional columns:
- `history_of_present_illness`
- `assessment`
- `weight`
- `height`
- `bp_systolic`
- `bp_diastolic`
- `pulse_rate`
- `temperature`

Lookup and dedupe rules:
- Patient resolution key: `(clinic, patient.phone == patient_phone)`
- Consultation dedupe key: `(clinic, patient_id, consultation_date)`

### Prescriptions Import CSV (Single-File, Repeated Parent Columns)

Each row represents one medication or procedure item under a prescription. Parent prescription fields repeat across rows.

Required parent columns:
- `patient_phone`
- `consultation_date`

Optional parent columns:
- `diet_advice`
- `lifestyle_advice`
- `exercise_advice`
- `follow_up_date`
- `follow_up_notes`

Child columns:
- `row_type` (`medication` or `procedure`)
- medication fields: `drug_name`, `dosage`, `frequency`, `duration`, `instructions`, `sort_order`
- procedure fields: `procedure_name`, `procedure_details`, `procedure_duration`, `procedure_follow_up_date`

Grouping and write behavior:
- Group key: `(patient_phone, consultation_date)` within clinic.
- Parent prescription upsert key: `(clinic, consultation_id)`.
- Child handling: replace-all children on confirm for each grouped parent to keep imports idempotent and deterministic.

## Acceptance Criteria

- [x] `IMPT-01`: Consultation CSV import supports preview + confirm with line-level validation errors.
- [x] `IMPT-02`: Prescription CSV import supports preview + confirm including medication/procedure data parsing.
- [x] `IMPT-03`: Import dependency order is enforced; invalid order returns clear error messages.
- [x] `EXPT-01`: Tenant can export all patients as CSV.
- [x] `EXPT-02`: Tenant can export all consultations as CSV with patient reference.
- [x] `EXPT-03`: Tenant can export all prescriptions as CSV with consultation reference and medication data.
- [x] `EXPT-04`: Tenant can export all clinic data as one ZIP containing all CSVs.
- [x] All import/export endpoints are tenant-scoped and deny cross-tenant data access.
- [x] Confirm policy is enforced for consultations/prescriptions: validation errors rollback whole request; only duplicates are skippable via `skip_duplicates=true`.
- [x] DB-level uniqueness enforces consultation dedupe key `(clinic, patient, consultation_date)`.
- [x] Export endpoints are restricted to owner/admin policy, throttled, and audited.
- [x] API docs updated for all new endpoints (drf-spectacular annotations).

## Success Metrics

- Import preview for 1,000-row consultation CSV completes in <= 2.0s p95 in staging.
- Import confirm for 1,000 valid consultation rows completes in <= 5.0s p95 in staging.
- Invalid dependency-order confirm requests persist 0 new rows (verified by integration test).
- ZIP export for a clinic with up to 10,000 patients returns 200 and completes in <= 15s p95 in staging.
- 100% of export requests generate an audit record with actor, clinic, endpoint, and timestamp.
- Zero cross-tenant records observed in import/export integration tests.

## Dependencies & Risks

- **Dependency:** Phase 2 tenant security fixes must remain in place for owner/member permissions.
- **Risk:** CSV schema drift between frontend templates and backend parsers.
- **Risk:** Prescription import complexity (nested medication/procedure rows) can cause ambiguous mapping if schema is under-specified.
- **Risk:** Bulk export endpoints can become data-exfiltration paths without strict RBAC/throttling/auditing.
- **Risk mitigation:** publish strict CSV templates, include sample files, and keep preview errors explicit.

## Sources & References

- **Origin brainstorm:** `docs/plans/2026-02-27-saas-multi-tenant-brainstorm.md` (carried forward: CSV-first recommendation, Phase 4 scope, dependency order)  
- Requirements: `.planning/REQUIREMENTS.md` (`IMPT-01..03`, `EXPT-01..04`)  
- Roadmap: `.planning/ROADMAP.md` (Phase 4: Data Portability)  
- Existing import implementation: `backend/patients/import_service.py`, `backend/patients/views.py`  
- Tenant isolation primitives: `backend/clinics/middleware.py`, `backend/clinics/mixins.py`  
- Related solution learnings: `docs/solutions/security-issues/phase2-team-management-security-review.md`, `docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md`
