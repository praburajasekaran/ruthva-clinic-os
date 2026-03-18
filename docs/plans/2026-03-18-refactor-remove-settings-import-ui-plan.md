---
title: Remove Import UI from Settings Page
type: refactor
status: completed
date: 2026-03-18
---

# Remove Import UI from Settings Page

## Overview

Remove consultation and prescription CSV import functionality from the Settings page. Patient import already lives at `/patients/import` — that's the only import flow going forward. Export functionality remains in Settings.

## Problem Statement / Motivation

The Settings page currently bundles consultation/prescription CSV import alongside exports in a "Data Portability" section. Per the [bulk patient import brainstorm](../brainstorms/2026-03-18-bulk-patient-import-brainstorm.md), import belongs closer to the data it affects — not buried in Settings. With patient import already on its own dedicated page, the consultation/prescription imports in Settings are redundant and confusing. Clean removal simplifies the UI and reduces dead code.

## Proposed Solution

1. Remove all import UI, state, handlers, and constants from the Settings page
2. Rename the "Import & Export" tab to "Export"
3. Delete the shared `ImportPreviewTable` component (unused after removal)
4. Remove unused API client methods for consultation/prescription import
5. Remove backend import endpoints and service files for consultations and prescriptions

## Acceptance Criteria

- [x] Settings page has no import UI — only export buttons remain
- [x] Settings tab renamed from "Import & Export" to "Export" with `Download` icon
- [x] Patient import at `/patients/import` is unaffected and still works
- [x] No unused imports, dead state variables, or orphaned components
- [x] Backend consultation/prescription import endpoints return 404
- [x] No lint errors or build failures

## Technical Approach

### Phase 1: Frontend — Settings Page Cleanup

**File: `frontend/src/app/(dashboard)/settings/page.tsx`**

Remove these elements from `DataPortabilitySection`:

| What | Lines (approx) | Why |
|------|----------------|-----|
| `consultationFile`, `prescriptionFile` state | ~435-436 | Only used by import handlers |
| `consultationInputRef`, `prescriptionInputRef` refs | ~441-442 | Only used by import file inputs |
| `skipDuplicates` state + checkbox | ~438, 546-554 | Only used by import confirm calls |
| `consultationPreview`, `prescriptionPreview` state | ~443-444 | Only used by import preview display |
| `CONSULTATION_TEMPLATE`, `PRESCRIPTION_TEMPLATE` constants | ~410-419 | Only used by import template downloads |
| `downloadTemplate` helper | ~421-429 | Only used by import template downloads |
| `FileUploadField` component | ~370-408 | Only used by import file pickers |
| `handleConsultationFileSelect`, `handleConsultationConfirm` handlers | ~454-487 | Consultation import logic |
| `handlePrescriptionFileSelect`, `handlePrescriptionConfirm` handlers | ~490-524 | Prescription import logic |
| Entire "Import CSV Data" `FormSection` block | ~544-653 | The import UI itself |

Clean up imports that become unused:
- `useRef` from React (verify not used elsewhere in file)
- `Upload` from lucide-react
- `FileDown` from lucide-react
- `ImportPreviewTable` component import
- `ImportPreviewResult` type
- `ImportConfirmResult` type (if unused after removal)

Rename the tab:
- Change tab label: `"Import & Export"` → `"Export"`
- Change tab icon: `ArrowDownUp` → `Download`
- Change tab value: `"portability"` → `"export"` (update `Tab` type union + all references)

**Keep intact:**
- `handleExport` function and all export buttons
- `isBusy` / `errorMessage` state (still used by exports)
- All `dataPortabilityApi.export*` method calls

### Phase 2: Frontend — Dead Code Cleanup

**File: `frontend/src/components/data-portability/ImportPreviewTable.tsx`** — DELETE

This component is only used by the Settings page consultation/prescription import sections. The patient import page (`/patients/import/page.tsx`) builds its own inline preview table and does not use this component.

**File: `frontend/src/lib/api.ts`**

Remove these methods from `dataPortabilityApi`:
- `previewConsultationsImport()` (line ~167)
- `confirmConsultationsImport()` (line ~168)
- `previewPrescriptionsImport()` (line ~171)
- `confirmPrescriptionsImport()` (line ~172)

Keep intact:
- `postCsvImportPreview()` helper — still used by `previewPatientImport`
- `postCsvImportConfirm()` helper — still used by `confirmPatientImport`
- All patient import methods
- All export methods
- `retryRuthvaSync`, `bulkDeletePatients`, `bulkToggleActivePatients`

### Phase 3: Backend — Remove Consultation/Prescription Import

**File: `backend/consultations/views.py`**

Remove:
- `import_preview` action (~lines 61-83)
- `import_confirm` action (~lines 96-123)
- `ConsultationImportService` import

**File: `backend/prescriptions/views.py`**

Remove:
- `import_preview` action (~lines 88-113)
- `import_confirm` action (~lines 126-153)
- `PrescriptionImportService` import

**File: `backend/consultations/import_service.py`** — DELETE

Entire file is dead code after endpoint removal.

**File: `backend/prescriptions/import_service.py`** — DELETE

Entire file is dead code after endpoint removal.

### Files Summary

| File | Action |
|------|--------|
| `frontend/src/app/(dashboard)/settings/page.tsx` | Edit: remove ~200 lines of import UI, handlers, state, constants; rename tab |
| `frontend/src/components/data-portability/ImportPreviewTable.tsx` | Delete |
| `frontend/src/lib/api.ts` | Edit: remove 4 unused API methods |
| `backend/consultations/views.py` | Edit: remove 2 import actions + import |
| `backend/prescriptions/views.py` | Edit: remove 2 import actions + import |
| `backend/consultations/import_service.py` | Delete |
| `backend/prescriptions/import_service.py` | Delete |

## Dependencies & Risks

- **Low risk**: This is purely removal — no new features, no data changes
- **Verify**: Patient import page (`/patients/import`) must remain fully functional after changes
- **Verify**: Export buttons in settings must remain functional
- **No migration needed**: No database or model changes

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-03-18-bulk-patient-import-brainstorm.md` — "Dedicated Import Page (not Settings)" decision
- Patient import page: `frontend/src/app/(dashboard)/patients/import/page.tsx`
- Settings page: `frontend/src/app/(dashboard)/settings/page.tsx`
- API client: `frontend/src/lib/api.ts` (lines 151-179)
- Learnings: `docs/solutions/ui-bugs/patients-list-stale-after-create.md` — state sync patterns
