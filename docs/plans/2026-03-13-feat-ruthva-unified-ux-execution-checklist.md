---
title: feat: Ruthva unified UX execution checklist
type: feat
status: active
date: 2026-03-13
---

# feat: Ruthva unified UX execution checklist

## Purpose

This checklist translates the Ruthva-first UX strategy into a concrete frontend execution queue mapped to actual files.

Use this as the implementation companion to:
- `docs/plans/2026-03-13-feat-ruthva-unified-ux-redesign-plan.md`
- `docs/analysis/2026-03-13-ruthva-major-user-journeys.md`
- `docs/analysis/2026-03-13-ruthva-unified-information-architecture.md`
- `docs/analysis/2026-03-13-ruthva-screen-ownership-map.md`
- `docs/analysis/2026-03-13-ruthva-ui-art-direction.md`
- `docs/analysis/2026-03-13-ruthva-unified-ux-implementation-spec.md`

---

## Execution Principles

- Start with naming, navigation, and CTA clarity before deeper polish
- Avoid route churn until labels and ownership are stable
- Reuse current APIs and route structure where possible
- Treat visual polish as a multiplier on workflow clarity, not a substitute for it

---

## Phase 1 -- Taxonomy and Navigation

**Priority:** P0
**Goal:** Make the product shell reflect Ruthva-first positioning.

### 1. Rename Follow-ups to Journeys in primary UI
- [ ] Update sidebar label from `Follow-ups` to `Journeys`
  - File: `frontend/src/components/layout/Sidebar.tsx`
- [ ] Update dashboard card label from `Follow-ups Due` to a journeys-oriented label
  - File: `frontend/src/app/(dashboard)/page.tsx`
- [ ] Update journeys page title and supporting copy
  - File: `frontend/src/app/(dashboard)/follow-ups/page.tsx`
- [ ] Update CTA copy linking into the queue/surface
  - Files:
    - `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
    - `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`

### 2. Reframe Consultations as Visits in user-facing copy
- [ ] Update top-level nav label from `Consultations` to `Visits`
  - File: `frontend/src/components/layout/Sidebar.tsx`
- [ ] Update page title and helper copy
  - File: `frontend/src/app/(dashboard)/consultations/page.tsx`
- [ ] Update visit-detail headers or contextual copy where appropriate
  - File: `frontend/src/app/(dashboard)/consultations/[id]/page.tsx`

### 3. Demote Prescriptions from product framing
- [ ] Decide whether to remove `Prescriptions` from the sidebar immediately or keep temporarily as a compatibility bridge
  - File: `frontend/src/components/layout/Sidebar.tsx`
- [ ] If kept temporarily, reduce its visual emphasis relative to `Journeys`, `Patients`, and `Visits`
  - File: `frontend/src/components/layout/Sidebar.tsx`

### 4. Normalize journey-related copy
- [ ] Change `Start Journey` to `Start Treatment Journey`
  - Files:
    - `frontend/src/components/integrations/StartJourneyModal.tsx`
    - `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
- [ ] Change `View / Edit Plan` and similar labels to `Open Treatment Plan`
  - Files:
    - `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
    - `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`

### Exit criteria
- [ ] The top-level shell tells a Ruthva-first story
- [ ] No primary screen still uses `Follow-ups` as the product’s main label
- [ ] No broken links or obvious navigation regressions

---

## Phase 2 -- Home as Command Center

**Priority:** P0
**Goal:** Make Home about attention, not generic reporting.

### 1. Replace generic KPI-first layout with continuity-first structure
- [ ] Rework hero/top section to highlight who needs attention now
  - File: `frontend/src/app/(dashboard)/page.tsx`
- [ ] Reduce reliance on generic metric tiles as the dominant visual language
  - File: `frontend/src/app/(dashboard)/page.tsx`
- [ ] Add or elevate journey-oriented sections:
  - at-risk patients
  - due today
  - recent returns
  - continuity summary
  - File: `frontend/src/app/(dashboard)/page.tsx`

### 2. Revisit dashboard supporting components/data types if needed
- [ ] Review whether current `DashboardStats` shape is sufficient for the redesigned Home
  - File: `frontend/src/lib/types.ts`
- [ ] If lightweight new frontend composition is enough, avoid backend changes in this pass

### Exit criteria
- [ ] Home feels like a daily command center
- [ ] Continuity is visually more prominent than generic clinic metrics

---

## Phase 3 -- Patient Detail as Care Hub

**Priority:** P0
**Goal:** Make patient detail the central workspace for an individual patient.

### 1. Reorder the page around active care state
- [ ] Elevate active journey summary higher in the page hierarchy
  - File: `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
- [ ] Ensure patient summary + active journey + next action are visually grouped
  - File: `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
- [ ] Make the page answer:
  - where is this patient in care?
  - what should happen next?

### 2. Clarify action hierarchy
- [ ] Keep `Start Consultation` as the dominant action
  - File: `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
- [ ] Demote less critical actions like plain edit
  - File: `frontend/src/app/(dashboard)/patients/[id]/page.tsx`

### 3. Review support components
- [ ] Audit `PatientBanner` to ensure it supports the new patient-as-care-hub framing
  - File: `frontend/src/components/patients/PatientBanner.tsx`
- [ ] Review keyboard shortcut hints so they support, not clutter, the page
  - Files:
    - `frontend/src/components/patients/PatientShortcutsInit.tsx`
    - `frontend/src/components/ui/KbdBadge.tsx`

### Exit criteria
- [ ] Patient detail clearly acts as the care hub
- [ ] Active journey and next action are visible without scrolling through static data first

---

## Phase 4 -- Visit Detail and Prescription Handoff

**Priority:** P0
**Goal:** Make visit -> prescription -> plan/journey feel like one intentional handoff chain.

### 1. Clarify visit detail as the assessment screen
- [ ] Rework header/action cluster to make `Write Prescription` or `Open Prescription` the obvious next step
  - File: `frontend/src/app/(dashboard)/consultations/[id]/page.tsx`
- [ ] Reduce peer-level competition between actions like edit, patient, and prescription
  - File: `frontend/src/app/(dashboard)/consultations/[id]/page.tsx`

### 2. Simplify prescription detail action hierarchy
- [ ] Keep the prescription page focused on:
  - what was prescribed
  - what happens next
  - File: `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
- [ ] Ensure one primary next step:
  - `Start Treatment Journey` if no journey
  - `Open Active Journey` if journey exists
  - File: `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
- [ ] Keep plan access visible but secondary
  - File: `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`

### 3. Review treatment journey modal copy and sequence
- [ ] Ensure modal language is consistent with the new Ruthva-first terminology
  - File: `frontend/src/components/integrations/StartJourneyModal.tsx`

### Exit criteria
- [ ] Visit detail naturally leads to prescription
- [ ] Prescription naturally leads to plan/journey
- [ ] Doctors no longer have to interpret multiple equal-weight next steps

---

## Phase 5 -- Journeys Surface Redesign

**Priority:** P1
**Goal:** Turn the current follow-ups queue into a more premium journeys operating surface.

### 1. Redesign the journeys page structure
- [ ] Rework top-of-page framing around treatment continuity rather than queue mechanics
  - File: `frontend/src/app/(dashboard)/follow-ups/page.tsx`
- [ ] Rename tabs and supporting copy where needed to feel more clinical and less operationally jargony
  - File: `frontend/src/app/(dashboard)/follow-ups/page.tsx`
- [ ] Improve top-level scanability:
  - patient
  - treatment state
  - reason for attention
  - next action
  - File: `frontend/src/app/(dashboard)/follow-ups/page.tsx`

### 2. Reduce density and inline-edit overload
- [ ] Audit which inline forms should remain inline vs be moved behind expansion or detail flows
  - File: `frontend/src/app/(dashboard)/follow-ups/page.tsx`
- [ ] Consider extracting large sections into components for clarity and maintainability
  - Candidate files to create:
    - `frontend/src/app/(dashboard)/follow-ups/components/JourneysNeedsAttention.tsx`
    - `frontend/src/app/(dashboard)/follow-ups/components/TherapistWorklist.tsx`
    - `frontend/src/app/(dashboard)/follow-ups/components/DoctorActions.tsx`
    - `frontend/src/app/(dashboard)/follow-ups/components/LegacyItems.tsx`

### 3. Preserve the single-queue strength
- [ ] Keep the strong single operational surface pattern from the treatment-workflow best-practices doc
  - File: `docs/solutions/best-practices/treatment-block-workflow-best-practices.md`
- [ ] Improve readability without fragmenting the workflow into too many destinations

### Exit criteria
- [ ] Journeys feels like the flagship operational surface
- [ ] Top-level scanning is easier
- [ ] Inline forms no longer dominate the first impression of the page

---

## Phase 6 -- Treatment Plan Detail Refinement

**Priority:** P1
**Goal:** Keep treatment plan detail operational and procedural, without letting it compete with journey detail for continuity ownership.

### 1. Refine treatment plan page hierarchy
- [ ] Ensure plan summary, blocks, and sessions are the primary story
  - File: `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`
- [ ] Keep continuity/journey references supportive, not dominant
  - File: `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`

### 2. Improve relationship back to journey/prescription
- [ ] Add or refine contextual links back to patient, prescription, and journeys
  - File: `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`

### Exit criteria
- [ ] Treatment plan page clearly owns execution design
- [ ] Journey remains the continuity source of truth

---

## Phase 7 -- Visual System Cleanup

**Priority:** P1
**Goal:** Make the product feel calmer, more deliberate, and more premium.

### 1. Global tokens and surfaces
- [ ] Review global color usage and reduce arbitrary accent mixing
  - Files:
    - `frontend/src/app/globals.css`
    - `frontend/tailwind.config.ts`
- [ ] Introduce more systematic surface and border usage
  - Files:
    - `frontend/src/app/globals.css`
    - shared UI components in `frontend/src/components/ui/`

### 2. Button hierarchy
- [ ] Revisit shared button variants to support stronger primary/secondary distinction
  - File: `frontend/src/components/ui/Button.tsx`

### 3. Status and badge consistency
- [ ] Audit and unify journey/treatment status badge styling
  - Candidate files:
    - `frontend/src/components/ui/StatusBadge.tsx`
    - `frontend/src/components/ui/RiskBadge.tsx`
    - `frontend/src/components/ui/KbdBadge.tsx`

### 4. Reduce “white card soup”
- [ ] Revisit the most card-heavy pages first:
  - `frontend/src/app/(dashboard)/page.tsx`
  - `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
  - `frontend/src/app/(dashboard)/consultations/[id]/page.tsx`
  - `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
  - `frontend/src/app/(dashboard)/follow-ups/page.tsx`

### Exit criteria
- [ ] Primary surfaces feel visually distinct from secondary context
- [ ] Status colors feel systematic
- [ ] The app reads as one designed system

---

## Phase 8 -- Validation and Safety Checks

**Priority:** P0 before final rollout
**Goal:** Avoid regressions while shipping the redesign.

### 1. Route and label integrity
- [ ] Check all places still referencing old `Follow-ups` copy
  - Command aid: `rg -n "Follow-ups|Follow-ups Due|View in Follow-ups" frontend/src`
- [ ] Check all places still referencing `Consultations` if `Visits` is adopted in UI labels
  - Command aid: `rg -n "Consultations" frontend/src`

### 2. Route safety
- [ ] If any backend route names/paths are changed later, review the existing URL collision learning
  - Reference: `docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md`

### 3. Build and lint
- [ ] Run frontend lint after each phase
  - Directory: `frontend/`
- [ ] Run frontend build before rollout
  - Directory: `frontend/`
- [ ] Resolve unrelated pre-existing build issues before declaring the redesign ready

### 4. Manual walkthroughs
- [ ] New patient -> visit -> prescription -> plan -> journey
- [ ] Existing patient -> open active journey -> resolve action
- [ ] Doctor workflow through journeys
- [ ] Therapist workflow through journeys
- [ ] Team/settings still accessible and visually secondary

---

## Suggested Implementation Order

Start in this order:

1. `frontend/src/components/layout/Sidebar.tsx`
2. `frontend/src/app/(dashboard)/page.tsx`
3. `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
4. `frontend/src/app/(dashboard)/consultations/[id]/page.tsx`
5. `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
6. `frontend/src/components/integrations/StartJourneyModal.tsx`
7. `frontend/src/app/(dashboard)/follow-ups/page.tsx`
8. `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`
9. shared visual system files

This sequence gives the fastest visible product shift with the least initial disruption.

---

## Definition of Done

- [ ] Navigation tells a Ruthva-first story
- [ ] `Journeys` is clearly the continuity hero surface
- [ ] Patient -> Visit -> Prescription -> Plan -> Journey handoff is easy to follow
- [ ] The app feels more premium and less like a generic clinic admin tool
- [ ] Terminology and CTA hierarchy are consistent across the main care workflow
