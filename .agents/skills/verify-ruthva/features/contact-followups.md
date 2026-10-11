# Patient calls

A doctor plans a patient contact and assigns it to a doctor or admin staff. The assignee records contact attempts. A doctor answers clinical questions, completes the contact, or reopens it.

## Sub-features

- `contact-create` saves a patient, reason, contact date, and assignee.
- `contact-retry` records No answer or Call later with a new contact date.
- `contact-question` sends a saved question to Waiting for doctor.
- `contact-reply` saves a doctor's answer and returns the contact to To contact.
- `contact-complete` records Reached patient without changing the clinical return date.
- `contact-reopen` plans another contact for a completed task.
- `contact-list` separates To contact, Waiting for doctor, and Completed.

## How to get to it (user POV)

- Choose sidebar `Follow-ups`, then `Patient calls` if Sessions & reviews is open. Route: `/follow-ups`.
- A patient record's `Patient follow-ups` link scopes the list to that patient.
- Saved prescription detail's `Plan a patient call` opens the creation form with that patient selected.
- Choose `Plan follow-up` on the list, then `Save follow-up` on the form.
- Choose `Open follow-up` to open `/follow-ups/contact/{observed task ID}`. Its `Open patient record →` link opens the patient.

## Driving it with agent-browser

Preconditions:

- Normal verified doctor and an active synthetic patient. A doctor can assign the contact to themselves, so no invitation fixture is required for this recipe.
- Positive admin-staff assignment and staff-only views require a separately invited, verified clinic user. A platform admin entitlement does not create an admin-staff assignee.
- To prove the clinical date remains separate, save a prescription with a known `follow_up_date` first.

- **Baseline.** Choose sidebar Follow-ups and require `Patient calls`. Before creating a contact, require `No patient calls planned.` The status group has `To contact`, `Waiting for doctor`, and `Completed` radios. Capture each status under test; these are separate from the clinical worklist's Doctor Review/Resolved controls.
- **Create.** Run `ruthva_data contact-before`. Choose `Plan follow-up`. Unless the patient is already selected, fill `Find a patient` and choose the saved patient's current button ref. Fill the labeled `Reason for contacting` with `Verification symptom check`. Fill `Contact on` with an ISO date suitable for the run, such as tomorrow in Asia/Kolkata. This is a native date input, not the calendar dialog described in SKILL.md. Keep the displayed doctor assignee. Capture `contact-create-before`, then choose `Save follow-up`. Require the saved task route, patient, reason, contact date, assignee, and `No contact recorded yet.` Reload and compare the `contact_followup` row in `ruthva_data contact-created`; status must be `open` and revision `0`.
- **Retry.** On detail choose the `No answer` radio, fill `Call notes` with `Verification no answer`, and fill `Next contact date` with a later ISO date. Choose `Save contact`, wait for the history entry, and reload. Require the updated date and No answer history. Compare the task date/revision and a `contact_followup_event` with action `no_answer`. `Call later` has its own radio and requires its own drive before claiming coverage.
- **Question and reply.** Choose `Ask doctor`, fill `Question for doctor` with `Verification question`, and choose `Save contact`. Require `Waiting for a doctor’s reply.` and the saved question history after reload. As the doctor, fill `Doctor reply` with `Verification answer`, then choose `Save doctor reply`. Require Ready for contact and the saved reply after reload. Compare `awaiting_doctor` then `open`, increasing revisions, and `question`/`doctor_reply` events in separate data observations.
- **Complete.** Choose `Reached patient`, fill `Call notes` with `Verification reached`, and choose `Save contact`. Reload and require `Contact completed. Clinical follow-up stays on the patient record.` Compare task status `completed` and the `reached` event. Return to the patient-call list, choose Completed, and reopen the same task through `Open follow-up`.
- **Reopen.** On completed detail, fill `Next contact date` with another later ISO date, then choose `Reopen contact`. Reload and require Ready for contact, the new date, and Contact reopened history. Compare task status `open` and the `reopen` event. The prescription's original `follow_up_date` must remain unchanged throughout retries, replies, completion, and reopening.

Use the shell functions defined in SKILL.md. Capture each transition and use distinct `ruthva_data` labels before/after writes.

## Gotchas

- This recipe records synthetic contact outcomes in the isolated app. It does not place telephone calls or send patient messages. Do not activate the phone link as part of local proof.
- Doctors see clinic contacts. Admin staff see their assignments and can record attempts; therapists use Sessions & reviews instead.
- Task updates require the current revision. A stale write should fail without adding an event; concurrent-write guarantees need worker runtime tests as well as browser proof.
- Assignment changes have a separate `Save assignment` control. A one-doctor fixture cannot prove reassignment or staff permissions.
- Patient calls and clinical return dates have separate storage and queues. Switching the top-level section can remove a patient filter; confirm the selected patient before saving.

Source entry points: `frontend/src/components/follow-ups/ContactFollowUps.tsx`, `frontend/src/components/follow-ups/ContactCreate.tsx`, `frontend/src/app/(dashboard)/follow-ups/contact/[id]/page.tsx`, and `worker/src/contact-followups.ts`.
