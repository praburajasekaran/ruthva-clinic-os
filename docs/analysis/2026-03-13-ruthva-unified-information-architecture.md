# Ruthva -- Unified Information Architecture

**Date:** 2026-03-13
**Scope:** Ruthva-first product structure, naming, and navigation hierarchy
**Brand assumption:** Ruthva is the market-facing brand. Clinic OS is bundled infrastructure that supports the paid treatment continuity value.
**Related docs:**
- `docs/analysis/2026-03-13-ruthva-major-user-journeys.md`
- `docs/analysis/2026-03-13-ruthva-screen-ownership-map.md`
- `docs/analysis/2026-03-13-ruthva-unified-ux-implementation-spec.md`

---

## Core IA Recommendation

The current product reads like a set of modules.

The new IA should read like a **care flow**.

### Current mental model
- Patients
- Consultations
- Prescriptions
- Follow-ups
- Team
- Settings

### Recommended mental model
- Home
- Journeys
- Patients
- Visits
- Team
- Settings

This keeps continuity at the center while still preserving the bundled clinic operations layer.

---

## IA Thesis

The product should not be organized around database nouns.

It should be organized around:
- the doctor’s daily priorities
- the treatment lifecycle
- the next clinical decision

This means:
- `Follow-ups` should be renamed
- `Consultations` and `Prescriptions` should stop being first-class top-nav destinations
- the care journey should be more visible than the administrative records

---

## Proposed Top-Level Navigation

### 1. Home
**Purpose:** Daily command center

Contains:
- patients needing attention
- at-risk journeys
- due today
- recent returns
- key continuity metrics

### 2. Journeys
**Purpose:** Ruthva’s primary operating surface

Contains:
- needs attention
- on track
- completed
- risk filters
- treatment execution queues

### 3. Patients
**Purpose:** Person-centered care hub

Contains:
- patient list
- patient detail
- patient history
- latest consultation, plan, and journey summary

### 4. Visits
**Purpose:** Consultation and recent clinical activity

Contains:
- consultation list
- consultation detail
- create visit

### 5. Team
**Purpose:** Staff and access management

### 6. Settings
**Purpose:** Clinic, branding, account, operational settings

---

## What Gets Demoted

### Consultations
Should no longer be top-level if the nav needs to stay very simple.

Recommended handling:
- expose as `Visits`
- link from patient detail
- link from home only when relevant

### Prescriptions
Should no longer be top-level navigation.

Recommended handling:
- access from consultation detail
- access from patient timeline/history
- access from active journey when needed

Why:
- prescriptions matter clinically, but they are not the market-facing product story
- top-level nav should reflect value, not storage categories

---

## Naming Recommendations

### Rename `Follow-ups`
**Recommended:** `Journeys`

Other acceptable options:
- `Treatment Journeys`
- `Active Treatments`
- `Continuity`

Best near-term choice:
- `Journeys`

Reason:
- `Follow-ups` sounds clerical and under-sells the product
- `Journeys` better captures the managed treatment lifecycle

### Rename `Consultations`
**Recommended:** `Visits`

Reason:
- shorter
- more intuitive
- friendlier in navigation

### Action label recommendations
- `Start Journey` -> `Start Treatment Journey`
- `View / Edit Plan` -> `Open Treatment Plan`
- `Follow-ups` button -> `Open Journeys`

---

## Recommended Navigation Hierarchy

### Primary navigation
- Home
- Journeys
- Patients
- Visits

### Secondary navigation
- Team
- Settings

### Global actions
- New Patient
- Start Consultation
- Search

This gives the app a clearer operating rhythm:
- primary work
- secondary administration
- always-available actions

---

## Entry Point Rules

### Global Search
Search should be accessible from every screen.

Use cases:
- find patient
- continue care
- start consultation
- open active journey

### Global Primary CTA
Use one global button:
- `New Patient`

Secondary contextual actions should appear inside the screen, not compete in the global nav.

---

## Page Grouping Model

### Group A: Daily operations
- Home
- Journeys

### Group B: Clinical context
- Patients
- Visits
- Prescriptions
- Treatment Plans

### Group C: Administration
- Team
- Settings

The UX should visually reinforce these groups.

---

## IA Rules By Screen Type

### Operational screens
- prioritize urgency
- prioritize next action
- show queues and attention states

### Clinical detail screens
- show context, history, and one dominant next step

### Administrative screens
- reduce visual prominence
- avoid competing with clinical actions

---

## Sitemap Recommendation

```text
Home
Journeys
  Needs Attention
  On Track
  Completed
  Journey Detail

Patients
  Patient List
  Patient Detail
  New Patient

Visits
  Visit List
  Visit Detail
  New Visit

Clinical Context
  Prescription Detail
  Treatment Plan Detail

Team
Settings
```

`Prescription Detail` and `Treatment Plan Detail` remain essential, but they behave as sub-screens within care delivery, not top-level product destinations.

---

## Summary Recommendation

The unified IA should do three things:

1. Make continuity the most visible layer
2. Make patient-centered care the supporting context
3. Demote admin and record taxonomy so the product stops feeling like a generic clinic OS

That is the architecture most aligned with the Ruthva brand and pricing model.
