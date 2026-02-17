---
title: "feat: View and Edit Consultations & Prescriptions"
type: feat
status: completed
date: 2026-02-17
---

# feat: View and Edit Consultations & Prescriptions

## Overview

Practitioners cannot view or edit records from the `/consultations` or `/prescriptions` list pages. Table rows are not clickable in either page, and there is no edit capability anywhere in the UI for either resource. The backend already supports viewing and updating both via `ModelViewSet` (GET, PUT, PATCH), so this is entirely a frontend feature.

## Problem Statement / Motivation

Both the `/consultations` and `/prescriptions` list pages (linked from the sidebar) are dead ends — rows are not clickable and there are no action buttons. Even after reaching the detail pages via other routes, there is no way to edit the data.

This blocks common clinical workflows:
- **Correcting data entry errors** after saving a consultation or prescription
- **Completing a partial consultation** that was saved in a hurry
- **Adjusting medication dosages** or adding missed medications to a prescription
- **Reviewing records** directly from the list pages

## Proposed Solution

### Part A: Consultations

#### A1. Make consultation rows clickable

Follow the patients list pattern: add `onClick` + `router.push()` to each table row.

**File:** `frontend/src/app/consultations/page.tsx`

```tsx
<tr
  key={consultation.id}
  onClick={() => router.push(`/consultations/${consultation.id}`)}
  className="cursor-pointer transition-colors hover:bg-gray-50"
>
```

#### A2. Add "Edit" button to consultation detail page

**File:** `frontend/src/app/consultations/[id]/page.tsx`

```tsx
<Link
  href={`/consultations/${consultation.id}/edit`}
  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  <Pencil className="h-4 w-4" />
  Edit Consultation
</Link>
```

#### A3. Create consultation edit page

**New file:** `frontend/src/app/consultations/[id]/edit/page.tsx`

1. Fetches existing consultation via `GET /api/v1/consultations/{id}/`
2. Passes data to `ConsultationForm` as `initialData`
3. Form submits via `PATCH` instead of `POST`
4. On success, redirects to `/consultations/{id}`

#### A4. Adapt ConsultationForm for edit mode

**File:** `frontend/src/components/consultations/ConsultationForm.tsx`

- Add props: `initialData?: ConsultationDetail`, `mode?: "create" | "edit"`, `consultationId?: number`
- Pre-fill reducer initial state from `initialData` when in edit mode
- Switch HTTP method: `POST /consultations/` (create) vs `PATCH /consultations/{id}/` (edit)
- Update button labels: "Save Consultation" vs "Update Consultation"
- Namespace draft keys: `consultation-draft-${patientId}` (create) vs `consultation-edit-draft-${consultationId}` (edit)
- Update redirect targets after successful save

#### A5. Lock patient field on backend updates

**File:** `backend/consultations/serializers.py`

```python
def validate_patient(self, value):
    if self.instance and self.instance.patient != value:
        raise serializers.ValidationError("Cannot reassign consultation to a different patient.")
    return value
```

---

### Part B: Prescriptions

#### B1. Make prescription rows clickable

**File:** `frontend/src/app/prescriptions/page.tsx`

```tsx
<tr
  key={prescription.id}
  onClick={() => router.push(`/prescriptions/${prescription.id}`)}
  className="cursor-pointer transition-colors hover:bg-gray-50"
>
```

#### B2. Add "Edit" button to prescription detail page

**File:** `frontend/src/app/prescriptions/[id]/page.tsx`

```tsx
<Link
  href={`/prescriptions/${prescription.id}/edit`}
  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  <Pencil className="h-4 w-4" />
  Edit Prescription
</Link>
```

#### B3. Create prescription edit page

**New file:** `frontend/src/app/prescriptions/[id]/edit/page.tsx`

1. Fetches existing prescription via `GET /api/v1/prescriptions/{id}/`
2. Passes data to `PrescriptionBuilder` as `initialData`
3. Form submits via `PATCH` instead of `POST`
4. On success, redirects to `/prescriptions/{id}`

#### B4. Adapt PrescriptionBuilder for edit mode

**File:** `frontend/src/components/prescriptions/PrescriptionBuilder.tsx`

- Add props: `initialData?: PrescriptionDetail`, `mode?: "create" | "edit"`, `prescriptionId?: number`
- Pre-fill reducer initial state from `initialData` — including populating medications array and procedures array
- Switch HTTP method: `POST /prescriptions/` (create) vs `PATCH /prescriptions/{id}/` (edit)
- Update button labels: "Save Prescription" vs "Update Prescription"
- Update redirect targets after successful save

#### B5. Lock consultation field on backend updates

**File:** `backend/prescriptions/serializers.py`

```python
def validate_consultation(self, value):
    if self.instance and self.instance.consultation != value:
        raise serializers.ValidationError("Cannot reassign prescription to a different consultation.")
    return value
```

The backend already has a tested `update()` method with the replace-all pattern for nested medications and procedures — no changes needed there.

## Technical Considerations

### Architecture

- **No new API endpoints needed** — both ModelViewSets already support all CRUD operations
- **Form component reuse** — both `ConsultationForm` and `PrescriptionBuilder` are adapted for edit mode rather than building separate edit forms
- **Draft key collision** — create and edit modes must use different storage keys

### Backend: Nested data on update

| Resource | Nested data handling |
|----------|---------------------|
| Consultation | Flat fields (Envagai Thervu, vitals) — standard `PATCH` works directly |
| Prescription | Nested medications + procedures — **replace-all pattern already implemented and tested** in `PrescriptionDetailSerializer.update()` |

The prescription serializer's update method:
- `medications_data is None` → leave existing medications untouched
- `medications_data == []` → clear all medications
- `medications_data == [...]` → delete old, create new (full replacement)

### Edge cases

| Scenario | Behavior |
|----------|----------|
| Edit consultation that has a prescription | Allow — editing diagnosis/vitals doesn't invalidate the Rx |
| Edit prescription — medication count changes | Replace-all pattern handles this cleanly |
| Two tabs editing same record | Last write wins (acceptable for single-practitioner MVP) |
| Edit form with stale draft in storage | Show "Resume draft?" prompt (existing pattern) |
| Navigate away with unsaved changes | Browser `beforeunload` warning (existing pattern) |

### Performance

- Both detail fetches are already optimized with `select_related` / `prefetch_related`
- Edit pages reuse the same API calls as detail pages — no additional endpoints

## Acceptance Criteria

### Consultations

- [x] Clicking a row in `/consultations` navigates to `/consultations/{id}` detail page
- [x] Consultation detail page shows an "Edit Consultation" button
- [x] Clicking "Edit Consultation" navigates to `/consultations/{id}/edit`
- [x] Edit page loads with all existing data pre-filled (vitals, general assessment, Envagai Thervu, diagnosis)
- [x] Submitting the edit form sends a `PATCH` request and updates the consultation
- [x] After successful update, redirects to the consultation detail page
- [x] Patient field cannot be changed on an existing consultation

### Prescriptions

- [x] Clicking a row in `/prescriptions` navigates to `/prescriptions/{id}` detail page
- [x] Prescription detail page shows an "Edit Prescription" button
- [x] Clicking "Edit Prescription" navigates to `/prescriptions/{id}/edit`
- [x] Edit page loads with all existing data pre-filled (medications, procedures, advice, follow-up)
- [x] Submitting the edit form sends a `PATCH` request and updates the prescription
- [x] Medications and procedures are correctly replaced via the replace-all pattern
- [x] After successful update, redirects to the prescription detail page
- [x] Consultation field cannot be changed on an existing prescription

### Non-functional

- [x] Edit pages load in under 1 second (single API call each)
- [x] Forms maintain existing accessibility standards
- [x] Mobile-responsive layout matches the create forms
- [x] Auto-save drafts for edit mode use separate keys from create mode

## Success Metrics

- Practitioners can view any record from its list page in 1 click (currently impossible for both)
- Practitioners can edit and save a consultation in under 30 seconds
- Practitioners can edit and save a prescription in under 60 seconds (more fields)
- Zero new API endpoints required

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|------------|
| ConsultationForm refactor | Medium — form is tightly coupled to create mode | Careful prop threading; test both modes |
| PrescriptionBuilder refactor | Medium — has dynamic medication/procedure rows that need pre-filling | Dispatch `ADD_MEDICATION` / `ADD_PROCEDURE` actions from initial data |
| Draft storage key collision | Low — but could cause data loss | Namespace keys by mode + ID |
| Replace-all pattern for Rx | Low — already implemented and tested | Existing backend tests validate this |

## MVP File Summary

### Files to create (2)

| File | Purpose |
|------|---------|
| `frontend/src/app/consultations/[id]/edit/page.tsx` | Consultation edit page — fetches data, renders ConsultationForm in edit mode |
| `frontend/src/app/prescriptions/[id]/edit/page.tsx` | Prescription edit page — fetches data, renders PrescriptionBuilder in edit mode |

### Files to modify (6)

| File | Changes |
|------|---------|
| `frontend/src/app/consultations/page.tsx` | Add `"use client"`, `useRouter`, clickable rows with `onClick` + cursor-pointer |
| `frontend/src/app/consultations/[id]/page.tsx` | Add "Edit Consultation" button with Pencil icon, Link to `/edit` |
| `frontend/src/components/consultations/ConsultationForm.tsx` | Add `mode`/`initialData`/`consultationId` props, conditional HTTP method, button labels, draft keys, redirects |
| `frontend/src/app/prescriptions/page.tsx` | Add `"use client"`, `useRouter`, clickable rows with `onClick` + cursor-pointer |
| `frontend/src/app/prescriptions/[id]/page.tsx` | Add "Edit Prescription" button with Pencil icon, Link to `/edit` |
| `frontend/src/components/prescriptions/PrescriptionBuilder.tsx` | Add `mode`/`initialData`/`prescriptionId` props, conditional HTTP method, button labels, pre-fill medications/procedures arrays |

### Backend files to modify (2)

| File | Changes |
|------|---------|
| `backend/consultations/serializers.py` | Add `validate_patient()` to prevent reassignment on update |
| `backend/prescriptions/serializers.py` | Add `validate_consultation()` to prevent reassignment on update |

## References

- Existing clickable row pattern: `frontend/src/app/patients/page.tsx`
- ConsultationForm: `frontend/src/components/consultations/ConsultationForm.tsx`
- PrescriptionBuilder: `frontend/src/components/prescriptions/PrescriptionBuilder.tsx`
- Backend consultation ViewSet: `backend/consultations/views.py`
- Backend prescription ViewSet: `backend/prescriptions/views.py`
- Prescription serializer with replace-all update: `backend/prescriptions/serializers.py`
- Nested update patterns: `docs/solutions/implementation-patterns/django-drf-backend-patterns-siddha-clinic.md`
- Draft auto-save gotchas: `docs/plans/2026-02-16-feat-phase1-clinic-ui-plan.md`
