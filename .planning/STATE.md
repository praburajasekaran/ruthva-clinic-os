# Project State

## Project reference

See [PROJECT.md](PROJECT.md), [ROADMAP.md](ROADMAP.md), and [REQUIREMENTS.md](REQUIREMENTS.md). Implementation review date is 2026-10-03.

**Core value:** AYUSH clinics manage patients and clinical care within their clinic's data boundary.
**Current focus:** Resolve recorded implementation gaps and product scope decisions, then verify the target runtime and configured services.

## Current position

All six roadmap phases have implementation for their current scope. The original v1 list contains 25 implemented requirements and three deliberately retired requirements. No original v1 requirement remains unmapped.

TEAM-06 and IMPT-05 were previously deferred and now have implementation. They are outside the original 28-item v1 count.

Phase 4 changed scope on 2026-03-18. Consultation and prescription history import flows were removed. Patient CSV import and owner clinical exports remain.

This is a source review. It does not verify deployment, production migration state, service configuration, or runtime behavior. No release dates, completion durations, or velocity estimates were inferred from file presence.

| Area | Current source state |
|---|---|
| Foundation and access | Implemented; signup and staff login use email codes |
| Team and roles | Implemented; invitation delivery needs configured email |
| Branding and settings | Implemented; current upload limit is 2 MB |
| Data portability | Patient import and three clinical CSV exports implemented; separate history imports retired |
| Diagnostic forms | Implemented for all discipline selections; form depth varies |
| Pharmacy and usage | Implemented; paid subscriptions remain deferred |
| Treatment plans and follow-ups | Implemented beyond the original phase list |
| External integrations | Code exists; configured service behavior remains unverified |
| SSO | Partial; frontend exchange endpoint is absent from current auth routes |

## Decisions carried forward

- Shared-schema tenancy retains clinic foreign keys and clinic-scoped queries.
- Clinic owner is separate from doctor, therapist, and admin roles.
- Clinical writes are doctor-restricted. Patient actions, stock adjustment, and dispensing use clinic-member permissions.
- Session feedback is therapist-only. Planned session edits are allowed for doctors and admins in the API.
- Separate consultation and prescription imports are retired. Restoring them requires a new scope decision.
- Patient.is_active is the archive flag. Clinic.active_patient_limit controls active capacity.
- The ZIP contains patients.csv, consultations.csv, and prescriptions.csv. It is not a complete backup.
- Unani and Yoga & Naturopathy use generic diagnostic notes.

## Pending work

- [ ] Resolve the SSO contract. Implement `/auth/sso/exchange/` or remove the disconnected `/sso` entry point after a scope decision.
- [ ] Reconcile the INR 999 per month offer, unlimited-patient claim, and 14-day trial with the current limits and deferred payment implementation.
- [ ] Verify migrations 0004 through 0006 and retained diagnostic data in the target database.
- [ ] Verify email code login, signup, invitations, and reminder delivery with the configured provider.
- [ ] Verify logo storage and access, prescription print and PDF output, and reminder scheduling in the target environment.
- [ ] Verify configured Ruthva journey requests, webhook updates, import sync retries, and GitHub feedback sync.
- [ ] Reconcile the planned-session editor for admins with the API's doctor and admin permission rule.

Deferred product work remains Razorpay subscriptions, multi-clinic membership, and direct Google Sheets import. Historical dosage and instruction suggestions and staff profile pictures remain recorded requests in [TO-DOS.md](../TO-DOS.md).

## Verification evidence

The feature map reviewed source references across 75 files. Those file hashes still matched at the start of this update. This update also inspected the diagnostic migration chain and the completed history import-removal plan.

Source inspection confirmed current models, routes, forms, permissions, and service calls. The earlier feature map's browser checks verified the generated map, not the clinic application's runtime.

Phase evidence is linked in [ROADMAP.md](ROADMAP.md). The removal decision is recorded in the [completed 2026-03-18 plan](../docs/plans/2026-03-18-refactor-remove-settings-import-ui-plan.md).

## Session continuity

**Last activity:** 2026-10-03 implementation and planning reconciliation.
**Stopped at:** Planning documents now describe the current source and retired scope.
**Next work:** Address pending decisions and verification items after selecting the target task.
**Resume file:** None.
