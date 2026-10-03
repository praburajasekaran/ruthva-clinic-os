# AYUSH SaaS Multi-Tenant Clinic Platform

## What this is

Ruthva Clinic OS is a Django REST Framework and Next.js clinic application with shared-schema multi-tenancy. Clinics select an AYUSH discipline and manage patients, consultations, prescriptions, pharmacy records, and treatment follow-ups within their clinic context.

Siddha, Ayurveda, and Homeopathy have dedicated diagnostic forms. Unani and Yoga & Naturopathy use generic diagnostic notes. Clinic records include a subdomain, branding, prescription settings, and capacity limits.

## Core value

AYUSH clinics can register staff and manage clinical care within their clinic's data boundary.

## Implementation status

Reviewed on 2026-10-03. Status describes the current source snapshot. It does not confirm deployment, production migration state, or external service operation.

The original v1 requirements have 25 implementations and three retired history import requirements. All six roadmap phases have implementation for their current scope. [REQUIREMENTS.md](REQUIREMENTS.md) contains the requirement ledger. [ROADMAP.md](ROADMAP.md) contains phase evidence and verification limits.

### Implemented foundation and access

- Clinic and User models with doctor, therapist, and admin roles. Owner access uses a separate flag.
- Clinic foreign keys, tenant middleware, clinic-filtered queries, and JWT clinic context.
- Clinic-scoped patient record IDs.
- Email-verified signup and progressive clinic onboarding.
- Email code login, token persistence, AuthProvider, and AuthGuard.
- Password token login through the API.
- Demo switching across Ayurveda, Siddha, and Homeopathy clinics.
- Clinic name and logo display in the sidebar and prescription output paths.

### Implemented clinic workflows

- Patient records, medical and family history, search, keyboard shortcuts, archive and bulk actions.
- Consultations with vitals, general assessment, diagnosis, diagnostic JSON, and browser-session draft recovery.
- Prescriptions with medication rows, catalog autocomplete, care advice, procedure entries, print, and PDF paths.
- Homeopathy case taking, prescribing fields, remedy response, and remedy history.
- Treatment plans, blocks, scheduled sessions, therapist feedback, and doctor review tasks.
- Dashboard statistics and role-specific follow-up queues.
- Medicine catalog, stock movement history, low-stock alerts, and dispensing.
- Team member management and email invitations.
- Staff profile editing and owner clinic branding, letterhead, margins, paper size, and review URL settings.
- Active patient capacity checks and owner usage display.

### Implemented portability and integrations

- Patient CSV import with template, preview, validation, duplicate handling, confirmation, and results.
- Baseline consultation creation when imported patient data includes a diagnosis.
- Owner exports for patients, consultations, and prescriptions. The ZIP contains those three CSVs.
- Reminder email command and cron endpoint.
- External Ruthva journey start, status, visit confirmation, webhook updates, and import sync retry.
- Feedback submission with optional screenshot and best-effort GitHub issue sync.

External email, storage, PDF runtime, Ruthva API, reminder scheduling, and GitHub integration need verification in the target environment.

### Retired scope

Separate consultation and prescription history import controls, endpoints, and services were deliberately removed on 2026-03-18. IMPT-01, IMPT-02, and IMPT-03 remain in the requirements ledger as retired items. Patient import is the supported import flow. The [completed removal plan](../docs/plans/2026-03-18-refactor-remove-settings-import-ui-plan.md) records this decision.

### Remaining decisions and work

- Resolve the disconnected SSO flow. The frontend calls `/auth/sso/exchange/`, but current auth routes do not register that endpoint.
- Align public pricing, trial, and unlimited-patient claims with implemented capacity rules and the deferred subscription flow.
- Verify the diagnostic migrations and retained data in the target database.
- Verify configured services and clinic workflows in the target environment.
- Reconcile admin access to the planned-session editor with the API permission rule.

Razorpay subscriptions, multi-clinic membership, direct Google Sheets import, historical prescribing suggestions, and staff profile pictures remain future work or recorded requests.

## Current implementation limits

- Logo upload checks a 2 MB byte limit and PNG or JPEG content type. The old 200 KB and 400x400 pixel specification is superseded.
- Patient archive state uses Patient.is_active, rather than a separate is_archived field.
- Active patient enforcement uses Clinic.active_patient_limit, which defaults to 200. The plan table alone does not implement a paid subscription lifecycle.
- Stock entries capture batch numbers and expiry dates. Dispensing deducts the medicine total without choosing a batch.
- The three clinical CSV exports omit other tables and some fields. They are not a complete backup or a lossless import and export workflow.
- The five discipline choices have different form depth. Unani and Yoga & Naturopathy currently use generic notes.

## Out of scope

- Real-time staff chat.
- A patient-facing portal in this clinic application.
- Separate schemas or databases for each tenant.
- Google OAuth login.
- A native mobile application.
- Multi-branch clinic management.

## Context and constraints

The application started as the single-clinic Siddha app Sivanethram. Its target users are independent AYUSH practitioners and small clinics in India.

The established stack uses Django REST Framework, Next.js, React, Tailwind, PostgreSQL, Lucide React, and JWT authentication. Multi-tenancy uses a shared schema with clinic foreign keys. File uploads use the configured Django storage backend. Existing integration code includes Resend email and WeasyPrint PDF generation. Razorpay remains a planned payment provider.

The [original multi-tenant brainstorm](../docs/plans/2026-02-27-saas-multi-tenant-brainstorm.md) records the earlier design. Its phase status and some feature scopes have been superseded by the current roadmap.

## Key decisions

| Decision | Current record |
|---|---|
| Shared-schema multi-tenancy | Clinic foreign keys and tenant filtering remain the implementation approach |
| Clinic FK on Prescription | Prescription records retain direct clinic context |
| Query mixin returns no records without clinic context | The source retains the fail-closed query behavior |
| JWT clinic context | Authentication carries clinic identity for request scoping |
| Clinic-scoped patient record IDs | The implementation keeps record generation within a clinic |
| Patient CSV import | The supported import flow has a dedicated patient page |
| Remove separate history imports | The completed 2026-03-18 plan retired consultation and prescription import flows |
| Clinical CSV ZIP | The export contract contains three clinical CSVs and excludes other tables |
| Separate code status from deployment status | This review records implementation evidence and leaves runtime verification explicit |

Last reviewed on 2026-10-03 against the current local implementation.
