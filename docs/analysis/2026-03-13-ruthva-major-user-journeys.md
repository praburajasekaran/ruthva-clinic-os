# Ruthva -- Major User Journey Flows

**Date:** 2026-03-13
**Scope:** Ruthva-first UX model for the main jobs-to-be-done
**Brand assumption:** Ruthva is the main product brand; clinic OS is bundled context for the paid treatment continuity engine.
**Related docs:**
- `docs/analysis/2026-03-13-ruthva-unified-information-architecture.md`
- `docs/analysis/2026-03-13-ruthva-screen-ownership-map.md`
- `docs/analysis/2026-03-13-ruthva-unified-ux-implementation-spec.md`

---

## Core UX Principle

Ruthva should feel like a **treatment execution system**.

The core mental model should be:

`Patient -> Visit -> Plan -> Journey -> Outcome`

Not:

`Patients -> Consultations -> Prescriptions -> Follow-ups`

Each major journey below is written to reduce context switching and make the next best action obvious.

---

## 1. Register a New Patient

**Job:** "I am seeing a new patient and want to begin care quickly."

### Recommended Flow
1. Click global primary CTA: `New Patient`
2. Complete quick intake:
   - Name
   - Phone
   - Age or DOB
   - Gender
   - Optional note
3. Save patient
4. Redirect immediately to `Start Consultation`
5. Complete visit
6. Create prescription / treatment plan
7. Start treatment journey

### UX Rule
- Patient creation should be a **short intake step**, not a destination.
- The product should carry the user forward automatically into care delivery.

---

## 2. Find an Existing Patient and Continue Care

**Job:** "This patient already exists. I want to resume care from where we left off."

### Recommended Flow
1. Use global search
2. Open patient record
3. See at a glance:
   - active journey status
   - latest visit
   - latest prescription / plan
   - next recommended action
4. Choose one clear action:
   - `Start Consultation`
   - `Open Active Journey`
   - `Open Treatment Plan`

### UX Rule
- Patient detail is the **care hub**, not a static record dump.

---

## 3. Start a Consultation

**Job:** "I want to record today’s visit and decide the next clinical step."

### Recommended Flow
1. Open patient
2. Click `Start Consultation`
3. Record symptoms, vitals, diagnosis, and notes
4. Save consultation
5. Move directly into:
   - `Write Prescription`
   - or `Return to Patient`

### UX Rule
- Consultation should naturally lead into treatment planning.

---

## 4. Write a Prescription

**Job:** "I want to prescribe treatment and move the patient forward."

### Recommended Flow
1. Open consultation
2. Click `Write Prescription`
3. Add medicines, advice, and follow-up guidance
4. Save prescription
5. Show one dominant next step:
   - `Create Treatment Plan`
   - or `Start Treatment Journey`

### UX Rule
- Prescription cannot be a dead-end detail screen.

---

## 5. Create a Treatment Plan

**Job:** "I want to define how this treatment will run over time."

### Recommended Flow
1. Open prescription
2. Click `Create Treatment Plan`
3. Define:
   - total days
   - blocks
   - procedures
   - sessions
4. Save plan
5. Show:
   - `Start Treatment Journey`
   - or `Open Journey`

### UX Rule
- The plan is the operational bridge between prescription and continuity.

---

## 6. Start a Treatment Journey

**Job:** "I want Ruthva to begin monitoring this treatment."

### Recommended Flow
1. From consultation, prescription, or plan, click `Start Treatment Journey`
2. Confirm:
   - duration
   - follow-up interval
   - consent
   - contact details
3. Save
4. Redirect to journey detail
5. Show:
   - status
   - next visit
   - risk state
   - recommended next action

### UX Rule
- Journey activation should feel like the moment Ruthva starts working.

---

## 7. Monitor Patients Who Need Attention

**Job:** "Show me who is slipping and what I need to do now."

### Recommended Flow
1. Open `Journeys`
2. Land on default tab: `Needs Attention`
3. Review prioritized list
4. Open a patient/journey
5. Take action:
   - mark returned
   - confirm visit
   - add next block
   - resolve issue

### UX Rule
- The queue should feel like guided triage, not a backlog table.

---

## 8. Review an Active Journey

**Job:** "I want to understand how this patient is progressing."

### Recommended Flow
1. Open patient or journeys list
2. Open active journey
3. Review:
   - treatment summary
   - plan status
   - risk level
   - missed visits
   - timeline
   - current block
4. Choose the next action

### UX Rule
- Journey detail is the operational source of truth.

---

## 9. Extend or Adjust a Treatment Plan

**Job:** "Treatment is continuing and I need to update the plan."

### Recommended Flow
1. Open active journey
2. Click `Open Treatment Plan`
3. Edit:
   - total days
   - upcoming block
   - planned sessions
4. Save changes
5. Return to journey with updated status

### UX Rule
- Plan edits should feel connected to live treatment, not like admin maintenance.

---

## 10. Handle a Missed Visit or At-Risk Patient

**Job:** "The patient is slipping and I need to intervene quickly."

### Recommended Flow
1. Open `Journeys > Needs Attention`
2. Select an at-risk patient
3. See why the patient is flagged
4. Choose intervention:
   - mark returned
   - review outreach history
   - update plan
   - contact patient
5. Resolve or keep under watch

### UX Rule
- Risk should be understandable and actionable in one view.

---

## 11. Complete a Treatment Journey

**Job:** "This treatment cycle is done and I want to close the loop properly."

### Recommended Flow
1. Open active journey
2. Confirm final visit / completion
3. Mark journey complete
4. Save final outcome
5. Return patient to standard monitoring state

### UX Rule
- Completion should be explicit and meaningful, not just a status side effect.

---

## 12. Daily Doctor Workflow

**Job:** "I just opened Ruthva. What should I do first?"

### Recommended Flow
1. Land on `Home`
2. See:
   - patients needing attention
   - due today
   - at-risk journeys
   - recent returns
3. Open the top-priority item
4. Resolve issue
5. Continue through the worklist

### UX Rule
- Home should act as a daily command center, not a passive dashboard.

---

## 13. Therapist / Execution Workflow

**Job:** "I want to record what happened in treatment execution today."

### Recommended Flow
1. Open `Journeys` or therapist worklist
2. View today’s assigned sessions
3. Record:
   - done / not done
   - response
   - notes
4. Escalate if doctor review is needed

### UX Rule
- Therapist work must stay lightweight and operational.

---

## 14. Admin / Clinic Owner Workflow

**Job:** "I want to manage the clinic without disrupting care flow."

### Recommended Flow
1. Open `Team` or `Settings`
2. Update:
   - staff
   - permissions
   - branding
   - clinic information
3. Return to the main product flow

### UX Rule
- Admin is secondary. It should never dominate the primary product narrative.

---

## Cross-Journey Rules

These should hold true across all journeys:

- There should be **one obvious next step** on every detail screen.
- The user should not need to understand backend entities to move forward.
- The continuity layer should feel central, not attached.
- `Journeys` should be the flagship operational surface.
- Patient creation, consultation, prescription, and plan creation should all feed the continuity engine cleanly.

---

## Summary Recommendation

The product should optimize for:

1. Fast patient-to-journey activation
2. Clear visibility into who needs attention now
3. Smooth movement from clinical context into continuity action
4. Minimal module-hopping

That is the UX foundation for a Ruthva-first product story.
