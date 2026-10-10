# Treatment and follow-ups

A clinic creates a treatment plan from a saved prescription, extends the plan in blocks, and updates planned sessions. Follow-ups lists work available to the current role.

## Sub-features

- `treatment-create` creates a plan and its first block from prescription detail.
- `treatment-plan-edit` saves changes to the plan's total duration.
- `treatment-next-block` extends the plan's session schedule.
- `treatment-session` saves edits to a planned session's procedure, medium, and instructions.
- `followups-list` displays pending follow-up work and opens its patient or plan.

## How to get to it (user POV)

- Choose the sidebar's `Follow-ups` link to open `/follow-ups`.
- Open a patient through the queue's patient name or `Open patient` link.
- On saved prescription detail, a doctor or admin chooses `New Treatment Plan`, fills the form, then chooses `Create Treatment Plan`.
- Prescription detail lists its saved treatment plans. Choose a plan link to open `/treatments/plans/{plan ID}`.
- Choose `Edit Plan`, change Total Days, then choose `Save Changes`.
- Choose `Add Next Block` on plan detail, then `Save Block`.
- Choose `Edit Session` for a planned session, then `Save Session`.

## Driving it with agent-browser

Preconditions:

- Normal clinic; baseline empty-queue proof requires no treatment fixture.
- Plan creation requires a saved prescription and a doctor or admin role. Use the consultation and prescription recipe first.
- Block/session drives require a plan created through the UI in this run and its observed ID. Do not seed a row and call it UI creation proof.
- Session-edit permissions require the current user's allowed role and a planned session.
- Prescription follow-up dates produce legacy items for therapist/admin views, not Doctor Review for a doctor. A doctor's queue can remain empty with a due prescription. Populated Doctor Review requires actual doctor-action tasks from treatment work. For a legacy fixture under an allowed role, open `Follow-up Date` and follow the calendar workflow in SKILL.md. Click the current day's full date button, whose name starts with `Today,`, then save the prescription. Selection closes the calendar immediately; compare the saved `follow_up_date` with D1.

- **Create plan.** On saved prescription detail, choose `ruthva_browser find role button click --name "New Treatment Plan"`. Capture `treatment-create-form`. Fill `#treatment-total-days` with `8`, `#treatment-block-start` with `1`, and `#treatment-block-end` with `5`. Keep the displayed Start Date or change it through its calendar. Use `ruthva_browser find placeholder "e.g. Abhyanga" fill Abhyanga`, `ruthva_browser find placeholder "e.g. Dhanwantharam Thailam" fill "Test oil"`, and `ruthva_browser find placeholder "Optional instructions" fill "Initial treatment instructions"`. The default entry covers days 1 to 5 with medium Oil. Choose `Create Treatment Plan`. Wait for the saved plan route and require one block with five planned sessions. Capture `treatment-created`, reload, and compare its prescription ID and session rows with `ruthva_data`.
- **Edit plan.** Choose `Edit Plan`, change Total Days to `10` through the current field ref, then choose `Save Changes`. Reload and require the saved duration in the UI and D1. Capture `treatment-plan-edit-after`.
- **Add block.** On plan detail choose `ruthva_browser find role button click --name "Add Next Block"`. Fill the visible block day fields by fresh refs. If the plan has reached its total, first extend Total Days through the plan's metadata editor and `Save Changes`; do not force a forbidden day range. Fill the procedure and medium placeholders, then choose `ruthva_browser find role button click --name "Save Block"`. Capture `treatment-next-block-after`; reload and confirm the new block and session count in UI and `ruthva_data`.
- **Session edit.** Snapshot the existing plan and choose the relevant planned session's `Edit Session` button by current ref. Fill its Procedure, Medium Type, Medium Name, and Instructions controls through fresh refs; enter instruction `Verification session instruction`. Choose `ruthva_browser find role button click --name "Save Session"`. Reopen the same editor after reload. Saved instructions must match both UI and the treatment session row. Capture `ruthva_capture treatment-session-after` with the session day visible. Feedback is a separate queue action, not this plan editor.
- **Follow-ups baseline.** Choose the sidebar's `Follow-ups` link by current snapshot ref (its accessible name can include the pending count). The owner doctor starts on `Doctor Review`. Run `ruthva_browser wait --text "No doctor review items match this view."` on an empty clinic, then `ruthva_capture followups-doctor-empty`. Choose `ruthva_browser find role button click --name Resolved` and capture the resolved empty state separately. Admins can also choose `Needs Attention`; therapists use `Execution Queue`. Test only tabs available to the actual role.
- **Populated follow-ups.** With a supported fixture for the current role's queue, open the patient's name or `Open patient` link from the list. Require the matching patient record ID. A due prescription alone is insufficient for the owner doctor's Doctor Review. Capture each available tab and each patient-link entry separately. Empty-queue proof does not verify due items, feedback submission, doctor decisions, or next-block actions.

Use the shell functions defined in SKILL.md. Record the observed date and Asia/Kolkata day in the proof when testing due/overdue work.

## Gotchas

- Block day ranges must fit within the plan and procedure entries must cover the intended days. Overlapping or uncovered days can reject a save.
- A prescription can have one active plan. A cancelled plan remains in history and permits a replacement. Existing blocks change available continuation controls.
- `/treatments/plans/new` is not a creation route. Start from `New Treatment Plan` on a saved prescription.
- Legacy numeric fields need current refs; do not assume their order from a different plan state.
- Saving planned session instructions does not prove feedback, completion, doctor-task resolution, reminder delivery, or export.
- No cron trigger runs in this harness. Captured local SES requests do not prove scheduled or human inbox delivery.
- External Ruthva journeys are blocked locally; report those paths as skipped with that limit.
