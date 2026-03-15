# Ruthva -- Screen Ownership Map

**Date:** 2026-03-13
**Scope:** Which screen owns which part of the doctor workflow in the Ruthva-first UX
**Related docs:**
- `docs/analysis/2026-03-13-ruthva-major-user-journeys.md`
- `docs/analysis/2026-03-13-ruthva-unified-information-architecture.md`
- `docs/analysis/2026-03-13-ruthva-unified-ux-implementation-spec.md`

---

## Purpose

One of the biggest UX issues in the current product is that multiple screens compete to own the same job.

Examples:
- patient detail, consultation detail, prescription detail, plan detail, and follow-ups all partly own "what happens next"
- prescriptions, plans, and journeys are visually presented like peers even though they belong to one treatment flow

This screen ownership map defines the primary job for each major screen so the interface becomes easier to reason about.

---

## Screen Ownership Principles

- Every major screen should have **one primary purpose**
- Every detail screen should have **one dominant next action**
- No major workflow step should depend on hopping across multiple equivalent screens to understand state
- Continuity state should live primarily in the journey layer

---

## Ownership Map

### 1. Home
**Owns:** daily prioritization

**Primary question it answers:**
- "What needs my attention right now?"

**Should contain:**
- patients needing attention
- due today
- at-risk journeys
- recent returns
- key continuity performance indicators

**Should not own:**
- long-form record review
- detailed plan editing
- full patient administration

---

### 2. Journeys List
**Owns:** continuity operations

**Primary question it answers:**
- "Which active treatments need action now?"

**Should contain:**
- prioritized worklist
- risk state
- due / missed / blocked items
- quick actions

**Should not own:**
- full clinical documentation
- full patient profile management

---

### 3. Journey Detail
**Owns:** treatment progression and continuity state

**Primary question it answers:**
- "How is this treatment progressing, and what should happen next?"

**Should contain:**
- journey status
- treatment summary
- risk state
- missed visits
- journey timeline
- link to plan
- recommended next action

**Should not own:**
- full consultation note editing
- full prescription authoring

---

### 4. Patient List
**Owns:** patient lookup and access

**Primary question it answers:**
- "Who am I trying to work on?"

**Should contain:**
- fast lookup
- latest status indicators
- jump-off points into active work

**Should not own:**
- day-to-day continuity triage

---

### 5. Patient Detail
**Owns:** person-centered care context

**Primary question it answers:**
- "What is the story of this patient, and where are they in care?"

**Should contain:**
- patient summary
- active journey snapshot
- latest visit
- latest prescription / plan
- patient timeline
- next action

**Should not own:**
- heavy operational queue management

---

### 6. Visit List
**Owns:** consultation browsing and recent clinical activity

**Primary question it answers:**
- "Which recent visits do I need to review?"

**Should contain:**
- recent consultation records
- patient linkage
- diagnosis summary
- prescription state

**Should not own:**
- continuity management

---

### 7. Visit Detail
**Owns:** today’s clinical assessment

**Primary question it answers:**
- "What happened in this visit and what should I do next?"

**Should contain:**
- symptoms
- vitals
- assessment
- diagnosis
- next action:
  - write prescription
  - open prescription

**Should not own:**
- long-term treatment monitoring

---

### 8. Prescription Detail
**Owns:** what was prescribed

**Primary question it answers:**
- "What treatment instructions were given?"

**Should contain:**
- medicines
- advice
- follow-up guidance
- linked treatment plan
- linked journey state
- one dominant next step

**Should not own:**
- the full continuity workflow

---

### 9. Treatment Plan Detail
**Owns:** execution design for treatment over time

**Primary question it answers:**
- "How will this treatment be executed over days, blocks, and sessions?"

**Should contain:**
- plan summary
- blocks
- session definitions
- editable future sessions
- extend / cancel / update controls

**Should not own:**
- patient risk management as the primary story

---

### 10. Team
**Owns:** staff and permission management

**Primary question it answers:**
- "Who has access and what role do they have?"

---

### 11. Settings
**Owns:** clinic configuration

**Primary question it answers:**
- "How is this clinic configured?"

---

## Ownership Chain for the Treatment Workflow

This is the intended handoff model:

```text
Patient Detail
  -> Start Visit

Visit Detail
  -> Write Prescription

Prescription Detail
  -> Create / Open Treatment Plan
  -> Start / Open Journey

Treatment Plan Detail
  -> Define execution

Journey Detail
  -> Monitor continuity
  -> Resolve risk
  -> Drive outcome
```

That handoff should feel intentional in the UI, not accidental.

---

## Primary CTA Rules By Screen

### Home
- `Review Needs Attention`

### Patient Detail
- `Start Consultation`

### Visit Detail
- `Write Prescription`

### Prescription Detail
- `Start Treatment Journey` or `Open Active Journey`

### Treatment Plan Detail
- `Add Next Block` or `Save Plan Changes`

### Journey Detail
- `Resolve Next Action`

This prevents action overload and keeps each screen legible.

---

## Summary Recommendation

The most important ownership change is this:

- `Journey` owns treatment progression
- `Plan` owns execution design
- `Prescription` owns treatment instructions
- `Visit` owns clinical assessment
- `Patient` owns longitudinal context

When those boundaries are clear, the product stops feeling like overlapping modules and starts feeling like one coherent system.
