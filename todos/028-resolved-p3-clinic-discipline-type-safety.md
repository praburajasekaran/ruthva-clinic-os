---
status: resolved
priority: p3
issue_id: "028"
tags: [typescript, type-safety, phase-5]
dependencies: []
---

# ClinicInfo.discipline typed as string, not Discipline

## Problem Statement

In `types.ts`, `ClinicInfo` has `discipline: string` but a `Discipline` union type is defined in the same file. Frontend components cast with `as Discipline` (e.g., `user?.clinic?.discipline ?? "siddha") as Discipline`), which could fail silently if the API returns an unexpected value.

## Findings

- [types.ts:19](frontend/src/lib/types.ts#L19): `discipline: string;` in ClinicInfo
- [types.ts:155-160](frontend/src/lib/types.ts#L155): `Discipline` union type defined but not used for ClinicInfo
- [ConsultationForm.tsx:118](frontend/src/components/consultations/ConsultationForm.tsx#L118): `(user?.clinic?.discipline ?? "siddha") as Discipline` — unsafe cast
- [page.tsx:18](frontend/src/app/(dashboard)/consultations/[id]/page.tsx#L18): Same pattern

## Proposed Solutions

### Option 1: Change ClinicInfo.discipline type to Discipline

**Approach:** Update `ClinicInfo` to use `discipline: Discipline` instead of `discipline: string`.

**Pros:**
- Compile-time safety — removes need for `as Discipline` casts
- API response type matches actual values

**Cons:**
- If the API ever returns a new discipline not in the union, TypeScript would flag it (which is actually a feature, not a bug)

**Effort:** 5 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `frontend/src/lib/types.ts:19` — change type
- `frontend/src/components/consultations/ConsultationForm.tsx:118` — remove `as Discipline` cast
- `frontend/src/app/(dashboard)/consultations/[id]/page.tsx:18` — remove `as Discipline` cast

## Acceptance Criteria

- [ ] ClinicInfo.discipline uses Discipline type
- [ ] No `as Discipline` casts remain in consultation components
- [ ] TypeScript compilation passes

## Work Log

### 2026-03-01 - Initial Discovery

**By:** Claude Code (Phase 5 review)
