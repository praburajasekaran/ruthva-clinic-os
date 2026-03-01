---
date: 2026-02-28
topic: ayurveda-siddha-treatment-plan-workflow
---

# Ayurveda/Siddha Treatment Plan Workflow

## What We're Building
Build a multi-session treatment planning workflow for Ayurveda/Siddha procedures where doctors can prescribe treatment blocks (up to 15/21 days), therapists execute sessions, and doctors revise upcoming days based on real feedback.

The plan format is hybrid: doctors can define both day-specific items and day-range blocks. Therapists do not modify prescribed content (procedure/oil/powder); they only execute and submit session feedback. After the current planned block ends (example: Days 1-5), completion of that block should create a doctor action to define the next block.

The existing follow-ups capability should be reused as the operational surface. Instead of adding a separate workflow area, the follow-ups page becomes the treatment operations queue with role-aware views.

## Why This Approach
Approach considered:
- Extend current flat prescription procedures only: too limited for day-wise execution and revision checkpoints.
- Build a completely separate treatment module: flexible but higher complexity and duplicate workflow UI.
- Reuse follow-ups as the queue while introducing structured treatment-plan entities: best balance of speed, clarity, and future readiness.

Chosen approach: reuse follow-ups page + add treatment-plan concepts. This keeps UX familiar, avoids new navigation burden, and fits the existing backend pattern that already tracks due items.

## Key Decisions
- Hybrid planning model: support both single-day entries and day-range entries in one treatment plan.
- Therapist logging scope: therapist records done/not done, symptom response score, and notes.
- Revision trigger model: therapist can request review anytime, and completion of the active block must automatically prompt doctor to create the next block.
- Role permissions: therapist is execute-and-report only; only doctors can create/edit treatment plans.
- Reminder surface: use follow-ups page, with persistent doctor action until next block is created.
- Follow-ups UX structure: two tabs for clarity:
  - Therapist Worklist
  - Doctor Actions

## Resolved Questions
- Q: Should plan be day-wise, phase-wise, or mixed?
  - A: Hybrid (mixed) model.
- Q: What minimum therapist feedback should be captured?
  - A: Done/not done + symptom response score + notes.
- Q: When should doctor be asked to revise plan?
  - A: Therapist can request anytime; automatic prompt after current block completion.
- Q: Can therapist edit treatment content?
  - A: No, doctor-only edits.
- Q: Where should reminders/actions live?
  - A: Follow-ups page.
- Q: One list or split view?
  - A: Two tabs.

## Open Questions
- None for brainstorm scope.

## Next Steps
-> `/prompts:workflows-plan` for implementation details, schema changes, API contract, and UI rollout plan.
