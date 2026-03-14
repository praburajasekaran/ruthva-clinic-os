# Plan: Treatment Plan View/Edit Flow

> Created: 2026-03-13
> Status: in-progress
> Trigger: User requested a proper "View / Edit Treatment Plan" flow from the prescription detail card.

## Goal & Success Criteria
- **Goal**: Make the treatment-plan card on prescription detail a real entry point for viewing and editing the plan.
- **Done when**: Doctors can open a treatment-plan detail page from `/prescriptions/[id]`, review blocks and sessions, extend/cancel the plan, add the next block, and edit planned sessions.
- **Non-goals**: Reworking the follow-ups queue, adding a brand-new backend endpoint, or changing Ruthva journey behavior.

## Current State
- `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx` shows a summary card but only links to `/follow-ups`.
- Backend already supports:
  - `GET /treatments/plans/:id/`
  - `PATCH /treatments/plans/:id/` for `total_days` and cancellation
  - `POST /treatments/plans/:id/blocks/`
  - `PATCH /treatments/sessions/:id/` for planned sessions
- Follow-ups page contains inline patterns for block creation and session editing that can be adapted.

## Task Breakdown

| # | Task | Files | Size | Depends On |
|---|------|-------|------|------------|
| 1 | Add treatment-plan detail page with summary and block/session timeline | `frontend/src/app/(dashboard)/treatments/plans/[id]/page.tsx` | M | — |
| 2 | Add inline plan editing controls using existing APIs | same file | M | T1 |
| 3 | Update prescription card actions to link into the new flow | `frontend/src/app/(dashboard)/prescriptions/[id]/page.tsx` | S | T1 |
| 4 | Verify with lint/targeted checks | affected frontend files | S | T2,T3 |

## Technical Design
- **Approach**: Build a dedicated client page for a single treatment plan, fetch the plan plus related prescription and patient context, and expose inline actions for extend/cancel, add block, and edit planned sessions. Reuse the same payload shapes already used by the follow-ups page to stay aligned with existing backend behavior.
- **Alternatives rejected**: Making the follow-ups page do double duty as a detail view would keep the current context problem and make plan editing harder to discover. Adding a second modal on the prescription page would duplicate substantial form logic in a cramped area.
- **Key decisions**: Keep editing on the detail page instead of `/edit`; preserve the follow-ups link as a secondary action; reuse the existing `BlockEntryForm` and session patch shape instead of inventing new components or APIs.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Detail page grows too large | M | M | Keep the page focused on a single plan and reuse existing UI patterns |
| Plan retrieval lacks enough context for breadcrumbs | M | L | Fetch related prescription and patient after the plan loads |
| Edit controls exposed to the wrong roles | L | H | Gate mutating actions to doctor/admin like the existing pages |

## Verification
- Open a prescription with an active plan and confirm the card links to the new page.
- Extend total days and verify the summary updates.
- Add a block and verify it appears in the plan detail.
- Edit a planned session and verify the updated values render immediately.
- Cancel a plan and verify status changes and edit actions disable.
