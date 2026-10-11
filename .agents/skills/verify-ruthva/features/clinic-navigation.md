# Clinic navigation

The clinic home leads with starting a visit. Patients, Visits, Medicines, and Therapies open the corresponding clinic records.

## Sub-features

- `clinic-home` shows the clinic identity, today's work, and the four main areas.
- `clinic-start-visit` finds an active patient before opening the consultation form.
- `clinic-visits` opens saved visits and the prescription list.
- `clinic-therapies` finds procedures and opens the patients with recorded activity.

## How to get to it (user POV)

- Choose the sidebar's `Home`, or open `/dashboard`. Home's `/` link redirects to the signed-in clinic home.
- Choose `Start visit` on Home or Visits to open `/visits/new`.
- Choose sidebar `Visits` to open `/consultations`. `All prescriptions →` opens `/prescriptions`.
- Choose sidebar `Medicines` to open `/pharmacy`; the page heading remains Pharmacy.
- Choose sidebar `Therapies` to open `/therapies`. Choose a therapy card to open its patient list.

## Driving it with agent-browser

Preconditions:

- Normal verified doctor account. Use the patient recipe first for the populated patient picker.
- For populated Therapies, create a prescription procedure or a treatment plan/session through the corresponding UI. The treatment fixture uses `Abhyanga`.

- **Home.** Choose the visible sidebar Home ref. Require the clinic identity, `Start visit`, the four area cards, and `Open follow-ups →`. Capture `clinic-home`. Card and sidebar entries are separate paths; capture the entry under test.
- **Start a visit.** Choose Home's `Start visit`. Require `/visits/new` and the `Find a patient` field. Fill it with `Verification`, wait for the saved patient's name/record ID, then choose that row's `Start visit`. Require `/patients/{observed patient ID}/consultations/new` and `Save Visit`. Capture the picker and form separately. Cancel an unused form through its real Cancel button. This entry does not prove the patient-detail `c` shortcut.
- **Visits and prescriptions.** Choose the sidebar Visits ref, not the patient's Visits tab. Require the saved patient's name and `Review visit →`. Open that link and compare saved complaints, diagnosis, and patient ID with D1. A visit with a prescription offers `Review visit completion`. Return to Visits and choose `All prescriptions →`; take a full snapshot to open the saved prescription's table cell and require the same record. Capture `clinic-visits` and `clinic-prescriptions` separately.
- **Therapies.** Choose the sidebar Therapies ref. Before fixtures, require `Therapies will appear here when a procedure or session is recorded.` After creating the treatment fixture, fill `Find a therapy` with `Abhyanga`. Require its card and patient count, then choose the card. The route has `?name=Abhyanga`; require the saved patient's record ID. Open that patient link and compare the patient ID with D1. Capture `clinic-therapies-list`, `clinic-therapy-patients`, and the resulting patient record. `Session worklist →` opens `/follow-ups?view=clinical`.

Use the shell functions defined in SKILL.md. These views read existing records; use `ruthva_data` to establish the fixtures independently.

## Gotchas

- Sidebar Visits and the patient-record Visits tab share a name. Medicines can also match `Confirm current medicines →`. Use current refs or the desktop sidebar selector from SKILL.md.
- The start-visit search has a 250 ms debounce and lists active patients. Archived patients can therefore be absent without a search failure.
- A therapy list entry comes from a saved procedure or session. Opening an empty list does not prove the populated path or session completion.

Source entry points: `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/app/(dashboard)/dashboard/page.tsx`, `frontend/src/app/(dashboard)/visits/new/page.tsx`, `frontend/src/app/(dashboard)/consultations/page.tsx`, and `frontend/src/app/(dashboard)/therapies/page.tsx`.
