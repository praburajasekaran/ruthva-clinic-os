---
status: resolved
priority: p2
issue_id: "026"
tags: [bug, frontend, phase-5]
dependencies: []
---

# mental_state not displayed on consultation detail page

## Problem Statement

The consultation detail page does not display the `mental_state` field in its General Assessment section. The field is saved correctly through the form (ConsultationForm includes it under General Assessment), but the read-only detail view omits it. Users cannot see mental state observations after saving a consultation.

## Findings

- [ConsultationForm.tsx:410-421](frontend/src/components/consultations/ConsultationForm.tsx#L410): Form correctly renders mental_state textarea under General Assessment
- [page.tsx:156-192](frontend/src/app/(dashboard)/consultations/[id]/page.tsx#L156): Detail page General Assessment section only renders appetite, bowel, micturition, sleep — mental_state is missing from the array
- The data is present in the API response (it's in `ConsultationDetailSerializer` fields)
- This is a display-only bug — data is saved and returned correctly

## Proposed Solutions

### Option 1: Add mental_state to the General Assessment display section

**Approach:** Add a mental_state entry to the detail page's General Assessment section, after the existing assessment items.

**Pros:**
- Simple fix, consistent with form layout
- Mental state doesn't follow the normal/abnormal pattern so it should be rendered separately (like the form does)

**Cons:**
- None

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Add a mental_state display item after the sleep entry in the General Assessment section at [page.tsx:192](frontend/src/app/(dashboard)/consultations/[id]/page.tsx#L192).

## Technical Details

**Affected files:**
- `frontend/src/app/(dashboard)/consultations/[id]/page.tsx:156-192` — add mental_state display

## Acceptance Criteria

- [ ] mental_state is visible on the consultation detail page
- [ ] Displays "—" when empty, shows text value when present
- [ ] Consistent styling with other General Assessment fields

## Work Log

### 2026-03-01 - Initial Discovery

**By:** Claude Code (Phase 5 review)

**Actions:**
- Compared form fields with detail page display fields
- Identified mental_state is saved but never displayed on detail view
