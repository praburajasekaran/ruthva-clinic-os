# Patients

A clinic registers patients, finds saved records through the list or global search, edits details, and archives patients without removing their history.

## Sub-features

- `patients-create` validates and persists basic patient details.
- `patients-dob` selects a birth date through month/year controls, calculates age, and prevents future dates.
- `patients-cancel` leaves no patient record for a discarded draft.
- `patients-search` finds a patient by name, phone, or record ID and handles no matches.
- `patients-global-search` opens a saved patient through the search dialog.
- `patients-edit` persists an updated field after reopening.
- `patients-archive` excludes an archived patient from Active Only and includes it in Showing All.
- `patients-record-tabs` separates Overview, Visits, Health history, and Patient details.
- `patients-health-history` saves allergy review, current medicine review, and medical/family history.
- `patients-overview` shows an overview from saved details when remote AI generation is unavailable.

## How to get to it (user POV)

- Choose the sidebar's `Patients` link to open `/patients`.
- Choose `New Patient` from the list, `Register Patient` from the empty state, or press `n` outside an editable field. Direct route: `/patients/new`.
- Choose `Date of Birth` on registration or patient edit to open its calendar.
- Search in `Search by name, phone, or ID...` on the list.
- Choose `Search patients (Ctrl+K)` in the sidebar, press `Control+k` or `Meta+k`, or press `/` outside an editable field.
- Open the patient's name link or focus its table row and press Enter/Space.
- Choose `Edit patient` on the patient's detail page. Use `Archive patient` or `Reactivate patient` there, or select a patient checkbox in the list for bulk Archive/Activate actions.
- Choose the record's `Overview`, `Visits`, `Health history`, or `Patient details` tab. Health history has `Add or edit history`; Patient details has `Add or edit details →`.

## Driving it with agent-browser

Preconditions:

- Normal verified clinic, not demo. Account onboarding is complete.
- The initial clinic has no patients. Create `Verification Patient` before search/edit/archive recipes.

- **Empty-state entry.** Run `ruthva_browser find role link click --name Patients`, then `ruthva_browser find role button click --name "Register Patient"`. Wait for `**/patients/new`. Capture `patients-create-empty-state-before`.
- **Create.** Run `ruthva_browser find placeholder "Patient full name" fill "Verification Patient"`, `ruthva_browser find placeholder "Age in years" fill 35`, `ruthva_browser find role radio click --name Female`, and `ruthva_browser find placeholder "10-digit mobile number" fill 9000000001`. Choose `ruthva_browser find role button click --name "Register Patient"`. Wait with `ruthva_browser wait --url '**/patients/*'`, then require the detail snapshot to contain the saved name, age, gender, phone, and record ID. Capture `patients-create-after`; run `ruthva_data`, and confirm exactly one corresponding `patients_patient` row in the clinic.
- **Date of birth.** During creation, use this path instead of entering Age, or open the saved patient's `Edit patient` link. Run `ruthva_browser find label "Date of Birth" click`. If an existing birth date opens a past month, select the current year and month through fresh calendar refs first. Capture `patients-dob-future-disabled` with the current month's future days disabled. From a fresh snapshot, select `1991` through the `Choose the Year` ref and `9` through the `Choose the Month` ref. Re-snapshot, then choose the day button whose full name contains `October 1st, 1991`. The dialog must close and the field must show `Oct 1, 1991`. Age becomes read-only with placeholder `Calculated from DOB`; compare its value with the age on the run's date. Save with `Register Patient` or `Save Changes`, reopen the patient, and compare `date_of_birth: 1991-10-01` and age in `ruthva_data`. Choose `Patient details` to inspect the saved birth date. Capture `patients-dob-after`. To exercise a month change on edit, select month `8` and `September 1st, 1991`, save, and require `1991-09-01` after reopening. Do not expect a fixed age outside the recorded verification date.
- **List and persistence.** Choose `Patients`, fill `Search by name, phone, or ID...` with `Verification Patient`, and wait for `ruthva_browser wait 'table[aria-label="Patients"]'`. Capture `patients-search-name`. Open `ruthva_browser find role link click --name "Verification Patient"`; reload and confirm the saved phone. Repeat the list search with `9000000001` and the observed record ID, capturing each entry separately.
- **No matches/clear.** Fill the list search with `Definitely Missing Patient`. Wait for `ruthva_browser wait --text "No patients found matching your search."`. Clear the same field with an empty string. The patient link must return.
- **Global button entry.** Choose `ruthva_browser find role button click --name "Search patients (Ctrl+K)"`. Fill `ruthva_browser find placeholder "Search patients by name or phone…" fill "Verification"`. Wait for `ruthva_browser wait '[role="option"]'`, snapshot, and choose the patient's current option ref. The detail page must show the same record ID. Save `patients-global-search-button`.
- **Global keyboard entries.** Run `ruthva_browser press Control+k`, search again, then press ArrowDown and Enter. Repeat with `Meta+k`. For `/`, first click a visible noneditable heading by its current snapshot ref, then `ruthva_browser press /`. Patient detail uses a level-2 patient-name heading; do not assume `h1` exists there. Capture the opened `Search patients` dialog for each key; Escape must close it. Do not claim keyboard coverage from the button entry.
- **New patient entries/cancel.** On the populated list choose `New Patient`, type `Discard Patient`, then choose `Cancel`. Repeat entry with `ruthva_browser click 'h1'` and `ruthva_browser press n`. Capture each entry. `ruthva_data` before and after cancellation must contain no `Discard Patient` row.
- **Edit.** Open the saved patient, choose the `Edit patient` link from a fresh snapshot, change the phone to `9000000002`, and choose `Save Changes`. Reopen from the list, reload, and confirm the new phone in UI and `ruthva_data`.
- **Record tabs and overview.** Open the saved patient. Require the name, record ID, and `Overview from saved details` in the local harness. Choose `Visits` through its record-tab ref, because the sidebar has another Visits link. Require saved complaints and diagnosis, then open the visit and confirm its patient. Choose `Patient details` to inspect demographic fields. Capture each tab separately. Remote AI generation is outside this local proof.
- **Health history.** Choose `Health history`, capture the unknown review state, and run `ruthva_data patients-history-before`. Choose `Add or edit history`. Take a fresh snapshot: `None known` occurs in both Allergy review and Medical history review, so use each group's current ref. Choose allergy `None known` and current-medicine `None`. Choose `Add medical history`, fill the labeled Disease with `Verification prior illness`, Duration with `2 years`, and Medication with `Verification prior medicine`. Choose `Save history`, reload, and require `No known allergies`, `None reported`, and the saved history text. Compare `allergies_review=none`, `current_medicines_status=none`, `medical_history_review=reviewed`, and the matching `patients_medicalhistory` row in `ruthva_data patients-history-after`. Family history has its own `Add family history` fields; save and compare `patients_familyhistory` separately before claiming that path.
- **Archive.** On the list choose `ruthva_browser find role checkbox check --name "Select Verification Patient"`, then `ruthva_browser find role button click --name Archive`. Active Only no longer lists that patient. Choose `ruthva_browser find role button click --name "Active Only"`; Showing All must include the patient with `Archived`. D1 must retain the row with `is_active=0`. Activate it through the same checkbox and `Activate`; confirm `is_active=1` and its return to Active Only.

Use the shell functions defined in SKILL.md. Run `ruthva_data patients-before` before a mutation and `ruthva_data patients-after` afterward to retain both observations.

## Gotchas

- Search debounces for 300 ms. Wait for the resulting row or empty message instead of capturing stale results.
- Indian phone numbers must have ten digits and start with 6–9. Duplicate-phone checks are informational.
- Selecting Date of Birth controls Age. Use the calendar workflow in SKILL.md; typing into `Age in years` applies only while Date of Birth is empty.
- Gender uses radio buttons, not a select. Clicking the selected radio again clears it.
- The detail route wait also matches `/patients/new`; require saved detail content before claiming success.
- Keyboard shortcuts are suppressed inside editable fields. Select/check actions do not open the patient row.
- The empty-state button disappears after creating a patient. Use a fresh run to reverify that entry.
- An unknown history review differs from an explicit `None known`. Adding a medical-history row sets the review to Reviewed. The API rejects contradictory review states.
- Permanent bulk deletion, import, and exports need their own recipes; archive proof does not cover them.
