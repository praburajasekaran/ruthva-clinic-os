# Ruthva verification map

Read this index before a drive. These seven feature groups cover the core clinic workflow, including the clinic navigation and assigned patient calls. Each recipe lists user entry points separately; proof through one entry does not cover the others.

## Baseline preconditions

- Launch with [SKILL.md](../SKILL.md) from the repository root and keep `RUTHVA_CONTROL` and `RUTHVA_RUN` in each shell command's environment.
- `doctor` must pass for the run's recorded origins, revision, and source hash.
- The initial D1 database is empty. Demo login creates read-only empty clinics. Create a normal verified clinic through account signup/onboarding before mutation recipes.
- Use `doctor@clinic.test`, clinic `Verification Clinic`, patient `Verification Patient`, phone `9000000001`, age `35`, and gender `Female` as synthetic fixtures. No external recipient receives email.
- Use the same browser session for dependent recipes. A new run has no previous patients or prescriptions.

## Driving conventions

- Use the `ruthva_browser`, `ruthva_capture`, `ruthva_inbox`, and `ruthva_data` shell functions from SKILL.md.
- Choose roles, labels, IDs, or placeholders. Take a fresh `snapshot -i` before using a ref for an unlabeled legacy field. Name matching is partial; use a current ref for Save when Save & Print is also present. Use a full `snapshot` to find clickable catalog and prescription table cells.
- Wait for the resulting route or visible text. Search has a 300 ms debounce and phone checks have a 500 ms debounce.
- Capture before and after states with `capture`, then use `ruthva_data` and reopen/reload after writes.
- Record the feature ID and entry point in artifact names and the proof report. Mark blocked paths as skipped with a reason.
- Cleanup removes scratch state, not `.audit/verify-ruthva/$RUTHVA_RUN/`.

## Features

| Recipe | User behavior |
| --- | --- |
| [Account access](account-access.md) | Signup, OTP verification, onboarding, normal login, demo disciplines, logout, admin access, and clinic activation. |
| [Clinic navigation](clinic-navigation.md) | Home, start a visit, visit and prescription lists, and therapy-to-patient navigation. |
| [Patients](patients.md) | Register, choose a date of birth with calculated age, cancel, search, keyboard search, record tabs, health history, edit, archive. |
| [Consultations and prescriptions](consultations-prescriptions.md) | Save a visit, select medicines, set a follow-up date, review visit completion, and display the print view. |
| [Treatment and follow-ups](treatment-followups.md) | Create plans from prescriptions, extend blocks, edit planned sessions, and inspect queues. |
| [Patient calls](contact-followups.md) | Plan assigned contacts, record retry dates, ask and answer doctor questions, complete, and reopen. |
| [Pharmacy](pharmacy.md) | Create a medicine, add stock, check its ledger, and dispense a prescription. |

For one shared mutation pass, create the normal account and patient first. Then create and stock the pharmacy medicine before selecting it from the prescription autocomplete. Dispensing requires the saved catalog ID; matching a typed drug name is insufficient.

## Proof and limits

The initial creation coverage is in [PROOF.md](../PROOF.md). Keep later maintenance results in ignored run notes. Recipe existence is not proof. Real SES delivery, Cloudflare service binding, Browser Rendering PDF, Ruthva integrations, and GitHub delivery are separate remote boundaries. The local harness blocks external API calls and captures SES calls.

The account recipe includes admin access and clinic activation. Launch with `--admin-email verification-admin@clinic.test` for positive activation checks. Other user surfaces exist: Team/invitation acceptance, Settings and qualifications, patient CSV import and exports, WhatsApp handoffs, and the admin feedback inbox. They are outside this map; add recipes before claiming coverage for changes to them. AI patient-summary generation requires the remote AI binding; the local patient recipe covers the saved-details fallback. Worker runtime tests supplement browser proof for tenant constraints, roles, quotas, stock rollback, contact revisions, and external contracts. Run `rtk npm --prefix worker test` when the changed behavior needs those guarantees.
