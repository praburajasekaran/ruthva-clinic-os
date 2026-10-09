# Treatment and follow-ups

A clinic finds follow-up work, extends an existing treatment plan in blocks, and updates planned sessions. Plan creation currently has no connected browser entry in this checkout.

## Sub-features

- `treatment-create-unreachable` records the missing browser entry rather than claiming plan creation from a disconnected form.
- `treatment-next-block` extends the plan's session schedule.
- `treatment-session` saves edits to a planned session's procedure, medium, and instructions.
- `followups-list` displays pending follow-up work and opens its patient or plan.

## How to get to it (user POV)

- Choose the sidebar's `Follow-ups` link to open `/follow-ups`.
- Open a patient through the queue's patient name or `Open patient` link.
- Existing plan detail is available at `/treatments/plans/{plan ID}` when a plan already exists. This checkout has no `Create Treatment Plan` or `View Treatment Plan` link on prescription detail. Do not invent an entry point.
- Choose `Add Next Block` on plan detail, then `Save Block`.
- Choose `Edit Session` for a planned session, then `Save Session`.

## Driving it with agent-browser

Preconditions:

- Normal clinic; baseline empty-queue proof requires no treatment fixture.
- Block/session drives require an existing synthetic plan in this run's D1 and its observed ID. The preceding UI recipes cannot create that plan in this checkout. Record these drives as skipped unless a supported fixture has been supplied separately. Do not seed a row and call it UI creation proof.
- Session-edit permissions require the current user's allowed role and a planned session.
- Prescription follow-up dates produce legacy items for therapist/admin views, not Doctor Review for a doctor. A doctor's queue can remain empty with a due prescription. Populated Doctor Review requires actual doctor-action tasks from treatment work. For a legacy fixture under an allowed role, set a real `Follow-up Date` through its calendar and Apply; the Today control can select the current day.

- **Missing create entry.** While signed in as the verified normal doctor with a saved prescription, take `snapshot -i` on prescription detail and capture `treatment-create-unreachable-prescription`. It has no create/view plan control, and CodeGraph reports no callers for `TreatmentPlanCreateForm`. Attempt `ruthva_browser open /treatments/plans/new`, take a full snapshot, and capture `treatment-create-route-attempt`; this checkout displays `Not found.` instead of a creation form. Run doctor and return to a known route. Report creation as verified-unreachable with the authenticated role and attempted route. Block/session editing remains skipped without an existing supported synthetic plan. Worker runtime tests cover the API contract separately.
- **Add block.** On plan detail choose `ruthva_browser find role button click --name "Add Next Block"`. Fill the visible block day fields by fresh refs. If the plan has reached its total, first extend Total Days through the plan's metadata editor and `Save Changes`; do not force a forbidden day range. Fill the procedure and medium placeholders, then choose `ruthva_browser find role button click --name "Save Block"`. Capture `treatment-next-block-after`; reload and confirm the new block and session count in UI and `ruthva_data`.
- **Session edit.** Snapshot the existing plan and choose the relevant planned session's `Edit Session` button by current ref. Fill its Procedure, Medium Type, Medium Name, and Instructions controls through fresh refs; enter instruction `Verification session instruction`. Choose `ruthva_browser find role button click --name "Save Session"`. Reopen the same editor after reload. Saved instructions must match both UI and the treatment session row. Capture `ruthva_capture treatment-session-after` with the session day visible. Feedback is a separate queue action, not this plan editor.
- **Follow-ups baseline.** Choose the sidebar's `Follow-ups` link by current snapshot ref (its accessible name can include the pending count). The owner doctor starts on `Doctor Review`. Run `ruthva_browser wait --text "No doctor review items match this view."` on an empty clinic, then `ruthva_capture followups-doctor-empty`. Choose `ruthva_browser find role button click --name Resolved` and capture the resolved empty state separately. Admins can also choose `Needs Attention`; therapists use `Execution Queue`. Test only tabs available to the actual role.
- **Populated follow-ups.** With a supported fixture for the current role's queue, open the patient's name or `Open patient` link from the list. Require the matching patient record ID. A due prescription alone is insufficient for the owner doctor's Doctor Review. Capture each available tab and each patient-link entry separately. Empty-queue proof does not verify due items, feedback submission, doctor decisions, or next-block actions.

Use the shell functions defined in SKILL.md. Record the observed date and Asia/Kolkata day in the proof when testing due/overdue work.

## Gotchas

- Block day ranges must fit within the plan and procedure entries must cover the intended days. Overlapping or uncovered days can reject a save.
- One plan per prescription and existing blocks change available continuation controls. Plan creation is currently unreachable from the browser.
- Legacy numeric fields need current refs; do not assume their order from a different plan state.
- Saving planned session instructions does not prove feedback, completion, doctor-task resolution, reminder delivery, or export.
- No cron trigger runs in this harness. Captured local SES requests do not prove scheduled or human inbox delivery.
- External Ruthva journeys are blocked locally; report those paths as skipped with that limit.
