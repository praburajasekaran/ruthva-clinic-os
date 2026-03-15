# Ruthva -- Unified UX Implementation Spec

**Date:** 2026-03-13
**Scope:** Practical UX implementation guidance for evolving the current Sivanethram UI into a Ruthva-first product experience
**Dependencies:**
- `docs/analysis/2026-03-13-ruthva-major-user-journeys.md`
- `docs/analysis/2026-03-13-ruthva-unified-information-architecture.md`
- `docs/analysis/2026-03-13-ruthva-screen-ownership-map.md`

---

## Objective

Transform the current UI from:

- a clinic OS with a follow-up feature

into:

- a Ruthva-branded treatment continuity platform with bundled clinic workflow support

This is primarily a **workflow and hierarchy redesign**, not a feature explosion.

---

## What Must Change

### 1. Continuity must become the hero
The current interface still makes continuity feel like one module among many.

Implementation consequence:
- rename `Follow-ups`
- elevate continuity metrics and worklists
- make treatment journeys more visible than generic admin lists

### 2. Module taxonomy must be de-emphasized
The current product exposes technical nouns as if they are equal product concepts.

Implementation consequence:
- simplify top-level nav
- move prescriptions out of top-level navigation
- reduce surface competition between visit, prescription, plan, and journey

### 3. Every detail screen needs a dominant next action
Many screens are informative but passive.

Implementation consequence:
- one primary CTA on each core screen
- supporting actions grouped more quietly

---

## Proposed Navigation Spec

### Top-level nav
- Home
- Journeys
- Patients
- Visits
- Team
- Settings

### Navigation changes from current state
- `Follow-ups` -> `Journeys`
- remove top-level `Prescriptions`
- `Consultations` -> `Visits`

### Global controls
- global search
- global `New Patient` CTA

---

## Screen-by-Screen Implementation Guidance

## 1. Home

### Goal
Make the landing screen feel like a daily command center.

### Replace current emphasis
From:
- generic counts
- recent patients

To:
- patients needing attention
- due today
- at-risk journeys
- recently recovered patients

### Required UI sections
- hero alert/work panel
- priority queues
- secondary operational stats
- recent activity

### Primary CTA
- `Review Needs Attention`

---

## 2. Journeys List

### Goal
Make this the flagship operational surface.

### IA requirements
- default tab: `Needs Attention`
- secondary tabs:
  - `On Track`
  - `Completed`

### Row/card contents
Every item should answer:
- who is the patient
- what treatment are they on
- why is this item here
- what is the next action

### Interaction guidance
- show quick actions for only the most relevant next step
- move heavy editing into detail pages or controlled expansions
- avoid too many inline form states in one scroll context

---

## 3. Journey Detail

### Goal
Make this the source of truth for continuity.

### Required sections
- patient identity strip
- treatment summary
- journey status / risk
- timeline
- next action panel
- links to visit, prescription, plan

### Primary CTA examples
- `Mark Returned`
- `Confirm Visit`
- `Open Treatment Plan`

---

## 4. Patient List

### Goal
Make lookup fast and status-aware.

### Improvements
- add stronger active-journey indicators
- show continuity state subtly in list rows
- make search the dominant interaction

### Primary CTA
- `New Patient`

---

## 5. Patient Detail

### Goal
Make patient detail the care hub.

### Required sections
- patient summary
- active journey snapshot
- latest visit
- latest prescription / plan
- patient timeline
- next recommended action

### Primary CTA
- `Start Consultation`

### Secondary actions
- edit patient
- open active journey
- open latest plan

---

## 6. Visit List

### Goal
Support recent visit review without competing with the journey layer.

### Improvements
- emphasize patient and diagnosis
- deemphasize table heaviness
- link clearly into prescription status

---

## 7. Visit Detail

### Goal
Support assessment and immediate progression.

### Required sections
- visit summary
- vitals
- findings
- diagnosis
- next-step panel

### Primary CTA
- `Write Prescription`

If a prescription already exists:
- `Open Prescription`

---

## 8. Prescription Detail

### Goal
Clarify what was prescribed and what the user should do next.

### Current problem
Prescription, plan, journey, and follow-up controls compete visually.

### Required structure
- prescription content
- treatment plan snapshot
- journey snapshot
- one next-step panel

### Primary CTA logic
- if no journey exists: `Start Treatment Journey`
- if journey exists: `Open Active Journey`

### Secondary actions
- `Open Treatment Plan`
- `Edit Prescription`

---

## 9. Treatment Plan Detail

### Goal
Own execution design without pretending to own continuity state.

### Required sections
- plan summary
- total days and status
- blocks
- sessions
- editable future work

### Primary CTA
- `Add Next Block`

### Secondary actions
- extend duration
- cancel plan
- edit future sessions
- return to journey

---

## 10. Team / Settings

### Goal
Keep admin necessary but visually quiet.

### Guidance
- preserve functional completeness
- reduce visual dominance
- do not let admin pages define product tone

---

## Visual System Recommendations

### Direction
The visual tone should be:
- calm
- clinical
- confident
- premium
- operational

Avoid:
- flat admin-dashboard sameness
- too many accent colors with equal weight
- noisy action clusters

### Specific implementation rules
- one primary brand color family for primary actions
- reserve amber/red for warning/risk only
- reduce color variety in top-level navigation and summary cards
- increase contrast between title, metadata, and helper text
- create stronger page rhythm with more deliberate grouping

---

## Action Hierarchy Rules

### Global rule
- one primary action per screen

### Secondary rule
- no more than 2-3 secondary actions visible at the same visual level

### Editing rule
- lightweight edits can be inline
- heavier workflows should use dedicated pages or structured sections

---

## Priority Rollout Plan

### Phase 1 -- Labeling and hierarchy cleanup
- rename `Follow-ups` to `Journeys`
- update navigation order
- simplify button labels
- reduce action clutter on prescription and patient detail

### Phase 2 -- Journey-first operational redesign
- redesign home around continuity work
- redesign journeys list around urgency and next action
- tighten patient detail around care progression

### Phase 3 -- Visual polish and consistency
- unify visual hierarchy
- reduce card/table sameness
- strengthen brand presence and product confidence

---

## Non-Goals

This spec does not require:
- adding many new backend features
- rebuilding the full clinic OS
- introducing more product modules
- making continuity optional in the product narrative

The point is not expansion.

The point is **better product framing, better hierarchy, and cleaner workflow design**.

---

## Summary Recommendation

To align the product with the Ruthva brand and business model:

1. Make `Journeys` the center of the app
2. Make patient, visit, prescription, and plan screens feed that center cleanly
3. Reduce top-level module sprawl
4. Strengthen action hierarchy and visual hierarchy everywhere

If implemented well, the product will stop feeling like "clinic software plus follow-ups" and start feeling like "the treatment continuity system for AYUSH clinics."
