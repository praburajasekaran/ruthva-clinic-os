# Consultations and prescriptions

A doctor saves a patient visit, writes medication instructions, reopens the prescription, and displays a printable prescription with the saved details.

## Sub-features

- `visit-save` persists vitals, complaints, and diagnosis.
- `visit-save-rx` saves the visit and enters prescription creation.
- `visit-conflict` shows a duplicate-date error and retains the unsaved draft.
- `rx-save` persists medication, dosage, frequency, timing, and advice.
- `rx-edit` preserves saved meal timing when other fields change.
- `rx-print` opens the frontend print view with the saved prescription.
- `rx-cancel` discards unsaved prescription changes.

## How to get to it (user POV)

- Open a patient and choose `New Consultation`, or press `c` on patient detail outside an editable field. Route: `/patients/{patient ID}/consultations/new`.
- Choose `Save Visit` or `Save & Write Rx` on the visit form.
- Open an existing visit from patient history or the sidebar's `Consultations` list. Choose `Write Prescription` when none exists or `View Prescription` when one exists.
- Open a saved prescription by clicking its row in the sidebar's `Prescriptions` list, or through its consultation. Press `p` on a consultation with a prescription.
- Choose `Save & Print` during creation or the saved prescription's `Print` link. Route: `/prescriptions/{prescription ID}/print`.

## Driving it with agent-browser

Preconditions:

- Normal Siddha clinic; `Verification Patient` exists. Use the patient recipe to create it.
- Use a fresh snapshot for record links and actual IDs. Braced IDs above describe routes, not literal commands.
- For dispensing, complete the pharmacy catalog/stock recipe first, then select its medicine suggestion in the builder. A free-text drug name can save without a catalog link.

- **Open visit.** Open `Verification Patient` from `/patients`; snapshot and choose its `New Consultation` link by current ref (the name includes the keyboard badge). Repeat the `c` entry separately. Capture `visit-open-button` and `visit-open-key` in separate runs/visits.
- **Visit fields.** Open the diagnosis disclosure using its visible button from `snapshot -i`. Fill `ruthva_browser find placeholder "Patient's main complaints and duration" fill "Verification headache for two days"` and `ruthva_browser find placeholder "Clinical diagnosis" fill "Verification diagnosis"`. Fill Weight/Height/BP if the change under test needs them, using the real labeled controls from the snapshot. Choose `ruthva_browser find role button click --name "Save Visit"`. Reopen the visit from patient history and confirm both saved text values. Capture `visit-save-after` and compare the consultation's patient ID and text in `ruthva_data`.
- **Save and write.** For a separate visit, choose `ruthva_browser find role button click --name "Save & Write Rx"`. Wait for `**/prescriptions/new`. Record this entry separately from choosing `Write Prescription` on an existing visit.
- **Duplicate visit.** With a saved visit for this patient and date, capture `ruthva_data visit-conflict-before`. Open `New Consultation`, use the same date, and enter `Draft retained after conflict` in Chief Complaints. Choose `Save Visit`. Require the visible alert `A visit already exists for this patient on this date.` and the retained complaint. Capture `visit-conflict-after` and compare D1 with the prior observation. No duplicate visit or replacement complaint may persist. Empty vitals are allowed; use a different date for another valid visit.
- **Medication.** In the builder, fill `ruthva_browser find placeholder "e.g., Nilavembu Kudineer" fill "Verification medicine"`. For a catalog link, wait for the `Medicine suggestions` listbox, take a full snapshot, and click the matching option by its observed role/name (which includes form and stock). `snapshot -i` can omit that option. Fill `ruthva_browser find placeholder Amount fill 5` and `ruthva_browser find placeholder "e.g., 15 days" fill "3 days"`. Snapshot the `Dosage unit`, `Frequency`, and `Timing` groups; click the `ml`, `BD`, and `After food` radios by current ref within the correct group. `BD — Twice daily` is displayed on saved detail, not the radio's accessible name. Fill `ruthva_browser find placeholder "e.g., Mix with warm water, take before food" fill "Verification instruction"`. Take a fresh `snapshot -i` and click the current **Save** ref; `find role button click --name Save` also matches **Save & Print**. Wait for saved detail before reloading, or choose Prescriptions, take a full snapshot, and click the saved record's patient cell. Reopen/reload and confirm the medication and instructions. `ruthva_data` must show the correct consultation/patient and, for dispensing, the selected medicine ID.
- **Print.** From a fresh builder choose `Save & Print`, or from saved prescription choose the `Print` link by snapshot ref. Capture both entries separately. If the print link opens a new tab, run `ruthva_browser tab list`, then select that tab's actual index. Confirm the route ends `/print` and the rendered page contains the patient's record ID, medication, dosage, frequency, timing, and clinic identity. Run `ruthva_browser screenshot` through `capture` before closing the print tab. This is frontend print evidence.
- **Edit and retain timing.** On saved detail, require `After food` and `உணவுக்குப் பின்` for the Siddha medication above. Choose `Edit`, change only Duration to `7 days`, and save through the current Save ref. Reopen detail and print. Both must retain the meal timing, and D1 must retain `timing: after_food` and `timing_tamil: உணவுக்குப் பின்` with the new duration. Capture `rx-edit-timing-after` and `rx-print-timing-after` separately.
- **Cancel.** Save `ruthva_data rx-cancel-before`, then open an unsaved builder or the saved prescription's Edit link. Enter `Discard medication` and choose `Cancel`. Creation returns to the consultation; editing returns to the saved prescription. Reload and compare `ruthva_data rx-cancel-after`: no discarded medication may persist, and editing cancellation must preserve the original prescription and catalog link.

Use the shell functions defined in SKILL.md. Wait for real rendered values, then capture the action path and resulting state.

## Gotchas

- Consultation sections open progressively. Missing complaint fields may be hidden behind a disclosure, not absent.
- Consultation drafts use localStorage. Resume/discard banners must be tested separately; do not clear them with an internal setter.
- Prescription pill groups can have repeated radio names across medications. Use a current group-scoped ref to avoid editing the wrong medication.
- The local API has no Browser Rendering binding. A frontend print page or browser-generated PDF does not verify the server PDF endpoint.
- Check meal timing separately from the route opening. Require the saved timing label in detail and print, then compare it with D1.
- The database permits one visit per clinic, patient, and date. Duplicate creation or a conflicting date edit returns HTTP 409 with the visible explanation. Open the existing visit from patient history to change it. For any unexpected save failure, run doctor, capture the form and browser console, and compare D1 before and after.
- Tamil labels depend on clinic discipline. Repeat discipline-specific requirements in separate normal clinics; demo mutations are rejected.
