---
title: feat: Ruthva unified UX redesign
type: feat
status: active
date: 2026-03-13
---

# feat: Ruthva unified UX redesign

## Overview

Redesign the current Sivanethram frontend into a Ruthva-first product experience that presents treatment continuity as the hero workflow and demotes clinic management into bundled supporting context.

This is not a feature-addition plan. It is a product framing, information architecture, and workflow redesign that should make the app feel like:

> "The treatment execution system for AYUSH clinics"

instead of:

> "Clinic software with a follow-up module"

The plan is based on the current UI implementation, the Ruthva landing-page positioning, the recent UX analysis docs written in `docs/analysis/`, and the strategic direction captured in the Qwen decision chat exported to `/Users/praburajasekaran/Downloads/chat-export-1773407030261.json`.

Companion docs:
- `docs/analysis/2026-03-13-ruthva-major-user-journeys.md`
- `docs/analysis/2026-03-13-ruthva-unified-information-architecture.md`
- `docs/analysis/2026-03-13-ruthva-screen-ownership-map.md`
- `docs/analysis/2026-03-13-ruthva-ui-art-direction.md`
- `docs/analysis/2026-03-13-ruthva-unified-ux-implementation-spec.md`
- `docs/plans/2026-03-13-feat-ruthva-unified-ux-execution-checklist.md`

## Problem Statement / Motivation

The current app is functional but strategically misaligned with the product story:

- The navigation treats `Patients`, `Consultations`, `Prescriptions`, and `Follow-ups` as equal product concepts even though continuity is the paid differentiator.
- Detail pages often show multiple competing actions without a clear next step.
- The app exposes implementation nouns instead of a single coherent care flow.
- The visual system feels like a competent internal tool rather than a premium, outcome-oriented product.

This creates three product risks:

1. **Positioning risk**: Ruthva’s paid value is visually under-expressed.
2. **Workflow risk**: Doctors have to understand too many internal concepts to know what to do next.
3. **Adoption risk**: The interface feels like a bundle of modules instead of one treatment execution system.

## Proposed Solution

Reframe the frontend around a Ruthva-first care flow:

`Patient -> Visit -> Plan -> Journey -> Outcome`

Key product changes:

- Make `Journeys` the flagship operating surface by renaming and redesigning `Follow-ups`
- Reorder navigation to prioritize continuity and daily attention
- Demote `Prescriptions` from top-level navigation and reposition it as a care sub-screen
- Clarify screen ownership so each detail page has one primary purpose and one dominant next action
- Redesign Home around “who needs attention now” instead of generic clinic-software counts
- Introduce a more deliberate visual hierarchy so the product feels calmer, more premium, and more enterprise-grade

## Technical Approach

### Architecture

This redesign should be implemented primarily in the Next.js frontend.

The backend APIs and domain model are already sufficient for most of the first pass. The work should focus on:

- navigation labels and hierarchy
- route ownership and entry points
- card/list/detail page composition
- CTA hierarchy
- visual consistency

The plan should avoid unnecessary backend churn. Existing endpoints for patients, consultations, prescriptions, journeys, treatment plans, and sessions should be reused wherever possible.

### Implementation Phases

#### Phase 1: Taxonomy and Navigation Foundation

**Goal:** Align the product shell with Ruthva-first positioning.

**Tasks**
- Rename `Follow-ups` to `Journeys` in user-facing navigation and headings
- Revisit top-level navigation structure:
  - Home
  - Journeys
  - Patients
  - Visits
  - Team
  - Settings
- Remove or demote top-level `Prescriptions`
- Define whether route paths change immediately or labels change first while preserving URLs
- Add/update shared copy strings for new product language:
  - `Start Treatment Journey`
  - `Open Treatment Plan`
  - `Journeys`
  - `Visits`

**Primary files likely affected**
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/app/(dashboard)/layout.tsx`
- `frontend/src/app/(dashboard)/page.tsx`
- `frontend/src/app/(dashboard)/follow-ups/page.tsx`
- `frontend/src/app/(dashboard)/consultations/page.tsx`
- `frontend/src/app/(dashboard)/prescriptions/page.tsx`
- `frontend/src/components/integrations/StartJourneyModal.tsx`

**Success criteria**
- Navigation reflects Ruthva-first IA
- Continuity terminology is no longer hidden behind “Follow-ups”
- No broken links or route collisions introduced

#### Phase 2: Workflow Ownership Redesign

**Goal:** Make each major screen answer one clear question and expose one dominant next action.

**Tasks**
- Redesign `Home` as a command center for continuity work:
  - patients needing attention
  - due today
  - at-risk journeys
  - recent returns
- Refactor `Patient Detail` into a true care hub:
  - patient summary
  - active journey snapshot
  - latest visit
  - latest plan/prescription
  - next action
- Refactor `Visit Detail` so it clearly leads to prescription
- Refactor `Prescription Detail` so it clearly leads to plan/journey instead of presenting multiple competing concepts
- Keep `Treatment Plan Detail` focused on execution design rather than continuity state
- Refactor `Journeys` list/detail to emphasize urgency, reason, and next action

**Primary files likely affected**
- `frontend/src/app/(dashboard)/page.tsx`
- `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
- `frontend/src/app/(dashboard)/consultations/[id]/page.tsx`
- `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
- `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`
- `frontend/src/app/(dashboard)/follow-ups/page.tsx`
- `frontend/src/components/patients/PatientBanner.tsx`
- `frontend/src/components/integrations/StartJourneyModal.tsx`

**Success criteria**
- Each detail screen has one dominant CTA
- Patient -> Visit -> Prescription -> Plan -> Journey handoff feels intentional
- Doctors no longer need to infer the next screen from backend concepts

#### Phase 3: Visual Hierarchy and Premium Polish

**Goal:** Make the product feel calmer, more deliberate, and more enterprise-grade.

**Tasks**
- Reduce “white card soup” and overuse of equal-weight bordered surfaces
- Tighten typography hierarchy:
  - titles
  - metadata
  - helper text
  - section headers
- Standardize semantic color usage:
  - one primary brand family
  - amber/red reserved for risk and alerts
  - less arbitrary blue/violet/emerald mixing
- Review CTA styling so one primary action per screen is unmistakable
- Rework empty states and list/table headers to teach the workflow, not just state absence
- Normalize badges, pills, and secondary actions across the app

**Primary files likely affected**
- `frontend/src/app/globals.css`
- `frontend/tailwind.config.ts`
- shared UI components in `frontend/src/components/ui/`
- the dashboard and detail pages listed in earlier phases

**Success criteria**
- Product feels like a designed system, not an assembled admin UI
- Continuity workflow looks like the premium product layer
- Admin screens remain functional but visually secondary

#### Phase 4: Validation and Rollout Safety

**Goal:** Ship the redesign without breaking core workflows or confusing existing users.

**Tasks**
- Validate navigation and route integrity
- Review keyboard shortcut behavior after IA changes
- Verify role-based journey workflows still make sense for doctor, therapist, and admin
- Audit for copy inconsistencies (`Follow-ups` vs `Journeys`)
- Run lint/build and targeted manual route checks
- Capture before/after screenshots for key surfaces

**Primary files likely affected**
- affected frontend routes
- any tests or route helpers that depend on old labels/paths

**Success criteria**
- No major workflow regressions
- Terminology is consistent across navigation, page titles, modals, and buttons
- Existing users can still find core tasks during the transition

## Alternative Approaches Considered

### A. Keep current IA and only “polish the visuals”

Rejected because the main issue is not polish alone. The current structure under-expresses Ruthva’s paid value and creates workflow ambiguity.

### B. Merge everything into a brand-new monolithic “Ruthva dashboard” in one pass

Rejected because it is too risky and too broad for a solo builder. The redesign should reuse existing routes and components where possible.

### C. Preserve Sivanethram-style clinic OS framing and treat continuity as a module

Rejected because it conflicts with the brand strategy and pricing model discussed in the Qwen decision chat. It would continue to make Ruthva feel like an add-on instead of the hero product.

## System-Wide Impact

### Interaction Graph

- Navigation changes affect every primary route and the user’s sense of orientation.
- CTA changes on patient, visit, prescription, plan, and journey screens affect the entire care handoff chain.
- Renaming `Follow-ups` to `Journeys` affects sidebar labels, page headers, empty states, buttons, and dashboard cards.
- Copy and hierarchy changes in one screen will influence how adjacent screens need to present linked entities.

### Error & Failure Propagation

- Most failures here are UX failures rather than backend exceptions:
  - user lands on the wrong next step
  - duplicate or conflicting CTAs appear
  - renamed screens create dead links or orientation loss
- Route/URL changes can cause broken navigation if labels and route definitions drift.
- Component extraction or shared UI refactors can introduce visual regressions if states are not tested across screens.

### State Lifecycle Risks

- If the redesign changes where actions are initiated from without preserving context, users may lose track of which patient, visit, or plan they are operating on.
- If navigation labels change without breadcrumb/context improvements, the product may feel more confusing during transition.
- If `Prescriptions` is demoted in the nav without strong in-flow links, users may struggle to rediscover it.

### API Surface Parity

- Backend API parity is mostly already present for the desired UX.
- Likely exceptions are copy or aggregation improvements if Home/Journeys need new summary data not exposed cleanly yet.
- Any later URL changes in the frontend must be audited against keyboard shortcuts and route helpers.

### Integration Test Scenarios

1. **New patient to journey**
   - Create patient -> start visit -> write prescription -> create/open plan -> start journey
2. **Existing patient continuity check**
   - Search patient -> open patient detail -> open active journey -> resolve a continuity action
3. **Doctor treatment workflow**
   - Visit detail -> open prescription -> open plan -> add next block -> return to journey
4. **Therapist execution workflow**
   - Open journeys/worklist -> record session completion -> escalate for review if needed
5. **Navigation coherence**
   - Move between Home, Journeys, Patients, and Visits without losing context or encountering old “Follow-ups” terminology

## Acceptance Criteria

### Functional Requirements

- [ ] Top-level navigation reflects the Ruthva-first IA
- [ ] `Follow-ups` is renamed to `Journeys` in all primary user-facing surfaces
- [ ] Home emphasizes continuity work over generic clinic counts
- [ ] Patient detail acts as the care hub for an individual patient
- [ ] Visit detail clearly leads to prescription
- [ ] Prescription detail clearly leads to treatment plan and/or journey
- [ ] Treatment plan detail owns execution design, not continuity status
- [ ] Journey surfaces clearly show status, reason, and next action

### Non-Functional Requirements

- [ ] Existing backend APIs are reused where practical
- [ ] Navigation changes do not introduce broken routes or path collisions
- [ ] Visual system changes preserve accessibility and readable hierarchy
- [ ] Role-specific flows remain intelligible for doctor, therapist, and admin

### Quality Gates

- [ ] Updated copy is consistent across navigation, buttons, headers, and empty states
- [ ] Lint passes after each major phase
- [ ] Build issues introduced by the redesign are resolved before rollout
- [ ] Manual walkthrough of the five integration scenarios is completed
- [ ] Before/after screenshots are captured for Home, Journeys, Patient Detail, Visit Detail, and Prescription Detail

## Success Metrics

- Doctors can understand the app’s main value within one session without being taught the internal object model
- The path from visit to active journey takes fewer decisions and less screen-hopping than today
- Continuity-related actions become more visible and are used more consistently
- Users describe the product as one coherent system rather than separate modules

## Dependencies & Prerequisites

- Existing UX analysis docs in `docs/analysis/`
- Current frontend route structure and shared UI components
- Existing journey/treatment-plan integration work already present in the frontend
- Agreement that Ruthva is the main product brand and continuity is the primary paid value layer

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Renaming screens creates broken links or confusing labels | Medium | High | Change labels first, then route paths only when necessary; audit all links |
| UX changes become visual polish without improving workflow clarity | Medium | High | Review each screen against ownership and next-action rules before polishing |
| Too much redesign is attempted in one pass | High | High | Ship in phases; prioritize IA and CTA hierarchy before deeper visuals |
| Existing users lose familiar navigation | Medium | Medium | Preserve route compatibility during transition and add strong contextual links |
| Frontend refactors introduce hidden regressions | Medium | Medium | Use targeted manual walkthroughs plus lint/build checks |

## Resource Requirements

- Solo builder implementation across multiple frontend routes and shared components
- Design review cycles using screenshots and route walkthroughs
- Time for copy cleanup and visual consistency work, not just structural changes

## Future Considerations

- Once the Ruthva-first IA is stable, consider whether URL paths should align with new naming (`/journeys` vs `/follow-ups`)
- Consider a more explicit journey detail screen as the main operational surface for continuity
- If dashboard metrics evolve, add continuity-specific summaries like at-risk patients, missed visits, recovered patients, and treatment completions
- Revisit visual identity at the component-library level after the first IA/workflow pass is stable

## Documentation Plan

- Keep the four `docs/analysis/2026-03-13-ruthva-*` docs as the design foundation
- Update implementation notes in future feature plans as specific screens are tackled
- Capture any final naming decisions and route conventions in a follow-up design/architecture note if they become stable product rules

## Sources & References

### Internal References

- UX journeys: `docs/analysis/2026-03-13-ruthva-major-user-journeys.md`
- IA: `docs/analysis/2026-03-13-ruthva-unified-information-architecture.md`
- screen ownership: `docs/analysis/2026-03-13-ruthva-screen-ownership-map.md`
- current dashboard: `frontend/src/app/(dashboard)/page.tsx`
- current journeys/follow-ups surface: `frontend/src/app/(dashboard)/follow-ups/page.tsx`
- current sidebar/nav: `frontend/src/components/layout/Sidebar.tsx`
- patient detail: `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
- consultation detail: `frontend/src/app/(dashboard)/consultations/[id]/page.tsx`
- prescription detail: `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx`
- treatment plan detail: `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx`

### Institutional Learnings

- `docs/solutions/best-practices/treatment-block-workflow-best-practices.md`
  - Preserve the “single queue” strength of the current follow-ups surface, but reduce density and extract clearer role-specific components.
- `docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md`
  - Be careful when renaming or restructuring URLs; path collisions in Django-backed flows can create subtle regressions.

### Strategic Context

- Qwen decision chat export: `/Users/praburajasekaran/Downloads/chat-export-1773407030261.json`
  - Key carried-forward decisions:
    - Ruthva is the ownable product brand
    - continuity is the primary paid value
    - doctors should experience one unified workflow
    - implementation should stay modular under the hood
