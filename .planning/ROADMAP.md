# Roadmap: AYUSH SaaS Multi-Tenant Clinic Platform

## Overview

Reviewed against the current implementation on 2026-10-03. The six phases have implementation for their current scope. This review confirms source code, routes, forms, and migrations. It does not confirm deployment, production migration state, or external service operation.

The original v1 list contains 28 requirements. Implementation exists for 25. Three consultation and prescription import requirements were deliberately retired on 2026-03-18. Patient CSV import remains the supported import flow.

The requirements and evidence are in [REQUIREMENTS.md](REQUIREMENTS.md). Current work and unresolved checks are in [STATE.md](STATE.md).

## Phase status

A checked phase means its current scope exists in source. Runtime verification remains separate.

- [x] **Phase 1: Foundation.** Clinic-scoped data, JWT sessions, signup, patient CSV import, and branded prescriptions.
- [x] **Phase 2: Team and roles.** Member management, email invitations, and operation-specific permissions.
- [x] **Phase 3: Branding and settings.** Clinic settings, logo upload, paper size, and prescription letterhead controls.
- [x] **Phase 4: Data portability.** Patient import and three clinical CSV exports. Separate consultation and prescription imports are retired.
- [x] **Phase 5: Multi-discipline.** Diagnostic JSON, the migration chain, and forms selected by clinic discipline.
- [x] **Phase 6: Pharmacy and usage.** Medicine catalog, stock movement, dispensing, active patient limits, and usage display.

## Phase details

### Phase 1: Foundation

**Goal:** A clinic can register staff, manage clinic-scoped patients, and record clinical care.

**Status:** Implemented in source.

The implementation includes Clinic and User models, clinic foreign keys on clinical records, tenant middleware, query filtering, JWT clinic context, AuthProvider, and AuthGuard. Patient record IDs are clinic-scoped. Prescriptions have browser print and PDF paths.

Registration now uses email verification followed by clinic onboarding. Staff login uses email codes. The password token endpoint remains available through the API. The demo account can switch between Ayurveda, Siddha, and Homeopathy clinics.

**Evidence:** [Auth routes](../backend/users/urls.py), [tenant middleware](../backend/clinics/middleware.py), [tenant query mixin](../backend/clinics/mixins.py), [AuthProvider](../frontend/src/components/auth/AuthProvider.tsx), and [patient import](../frontend/src/app/(dashboard)/patients/import/page.tsx).

**Verification still required:** Check configured email delivery, clinic routing, tenant isolation, and prescription output in the target environment.

### Phase 2: Team and roles

**Goal:** Owners manage clinic membership. Staff actions use the appropriate role permissions.

**Depends on:** Phase 1.
**Requirements:** TEAM-01, TEAM-02, TEAM-03, TEAM-04, PERM-01.
**Status:** Implemented in source. Invitation delivery requires email configuration.

Owners can list, invite, update, and remove members. Invitation acceptance has a public page. The Free plan allows one doctor, one therapist, and one admin. Pending invitations count toward these role limits.

Doctors can write consultations, prescriptions, medicine catalog entries, and treatment plans. Other clinic members can read these records. Patient record actions, stock adjustment, and dispensing use broader clinic-member access. Session feedback is therapist-only. The session edit API allows doctors and admins to edit planned sessions.

Clinic owner is a separate flag from the staff role. An admin role does not imply owner access.

**Evidence:** [Team API](../backend/clinics/views.py), [permissions](../backend/clinics/permissions.py), [plan role limits](../backend/clinics/plan_limits.py), [treatment permissions](../backend/treatments/views.py), and [Team page](../frontend/src/app/(dashboard)/team/page.tsx).

### Phase 3: Branding and settings

**Goal:** Owners manage clinic identity and prescription output settings.

**Depends on:** Phase 2.
**Requirements:** BRND-01, BRND-02, BRND-03, BRND-04.
**Status:** Implemented in source with updated upload scope.

Settings includes staff profile editing and owner-only Clinic, Usage, and Export tabs. Clinic settings include contact details, address, tagline, primary color, logo, A4 or A5 paper, digital or preprinted letterhead, margins, and a Google Review URL.

The current logo endpoint checks a 2 MB byte limit and PNG or JPEG content type. It uses Django's configured default storage. The original 200 KB and 400x400 pixel specification no longer describes the implementation. The current endpoint does not enforce a 400x400 pixel limit.

**Evidence:** [Settings page](../frontend/src/app/(dashboard)/settings/page.tsx), [logo upload endpoint](../backend/users/views.py), [Clinic fields](../backend/clinics/models.py), [sidebar](../frontend/src/components/layout/Sidebar.tsx), and [prescription print view](../frontend/src/app/(dashboard)/prescriptions/[id]/print/page.tsx).

**Verification still required:** Check storage configuration, uploaded logo access, and print and PDF output in the target environment.

### Phase 4: Data portability

**Goal:** Staff import existing patients. Owners download the supported clinical CSV records.

**Depends on:** Phase 2.
**Current requirements:** EXPT-01, EXPT-02, EXPT-03, EXPT-04. Patient import remains part of Phase 1. Its interface also fulfills previously deferred IMPT-05.
**Status:** Current scope implemented. IMPT-01, IMPT-02, and IMPT-03 are retired.

The patient import wizard provides a template, upload, validation preview, duplicate handling, confirmation, and results. A supplied diagnosis creates a baseline consultation. A supplied last_seen_date sets that visit's date. A next_review_date queues the patient for external Ruthva sync when configured. It does not create a local prescription follow-up.

Owners can export patients, consultations, and prescriptions separately. Prescription CSV rows include medications and procedures. The ZIP contains exactly `patients.csv`, `consultations.csv`, and `prescriptions.csv`. These exports omit other tables and some model fields. They are not a complete backup or a lossless import and export workflow.

The [completed import-removal plan](../docs/plans/2026-03-18-refactor-remove-settings-import-ui-plan.md) deliberately removed consultation and prescription import controls, API methods, endpoints, services, and the shared ImportPreviewTable. The older Phase 4 plan records historical work that was later removed.

**Evidence:** [Patient import wizard](../frontend/src/app/(dashboard)/patients/import/page.tsx), [patient import service](../backend/patients/import_service.py), [export service](../backend/clinics/export_service.py), [export endpoints](../backend/config/views.py), and [Settings Export tab](../frontend/src/app/(dashboard)/settings/page.tsx).

### Phase 5: Multi-discipline

**Goal:** Consultations store diagnostic JSON and show the clinic's selected diagnostic form.

**Depends on:** Phase 1 clinical records. The retired history import flows are not a prerequisite.
**Requirements:** DISC-01, DISC-02, DISC-03, DISC-04.
**Status:** Implemented in source. Production migration application is unverified.

Consultation.diagnostic_data is a JSONField. Migrations 0004, 0005, and 0006 add the field, copy the eight legacy Envagai values into JSON, and remove the old columns. The copy migration includes a row-count check and a reverse operation. Their presence does not prove the production database has applied them or that production records were preserved.

The diagnostic router selects these forms:

| Discipline | Current form |
|---|---|
| Siddha | Envagai Thervu eight-fold examination |
| Ayurveda | Prakriti |
| Homeopathy | Structured case taking |
| Unani | Generic diagnostic notes |
| Yoga & Naturopathy | Generic diagnostic notes |

Homeopathy also has potency, dilution scale, pellet count, remedy response, and a patient remedy timeline.

**Evidence:** [Consultation model](../backend/consultations/models.py), [add-field migration](../backend/consultations/migrations/0004_add_diagnostic_data.py), [copy migration](../backend/consultations/migrations/0005_migrate_envagai_to_json.py), [remove-column migration](../backend/consultations/migrations/0006_remove_envagai_columns.py), and [diagnostic router](../frontend/src/components/consultations/DiagnosticFormRouter.tsx).

### Phase 6: Pharmacy and usage

**Goal:** Clinics maintain medicine inventory, record dispensing, and manage active patient capacity.

**Depends on:** Phases 1 and 5.
**Requirements:** PHRM-01, PHRM-02, PHRM-03, PHRM-04, PHRM-05, BILL-01, BILL-02, BILL-03.
**Status:** Implemented in source. Paid subscriptions remain deferred.

The catalog has medicine names, Tamil names, brands, categories, dosage forms, prices, active status, stock totals, and reorder levels. Stock movement records purchases, adjustments, and dispensing. Active medicines at or below their reorder level appear in low-stock alerts. Prescription rows can select medicines through catalog autocomplete.

Dispensing checks available stock, deducts the medicine total, and records name and price snapshots. Stock entries can store batch numbers and expiry dates. The dispensing flow does not select a batch or maintain a remaining balance for each batch.

Patient.is_active distinguishes active and archived records. Creation, import, and reactivation check Clinic.active_patient_limit, which defaults to 200. The owner usage view reports active count, limit, percentage, medicine count, and low-stock count.

The plan table lists Free and Pro capacity values. This table does not implement Razorpay subscription changes. Patient enforcement uses the clinic's active_patient_limit field.

**Evidence:** [Pharmacy models](../backend/pharmacy/models.py), [stock and dispensing API](../backend/pharmacy/views.py), [medicine autocomplete](../frontend/src/components/pharmacy/MedicineAutocomplete.tsx), [patient capacity checks](../backend/patients/views.py), [plan limits](../backend/clinics/plan_limits.py), and [usage display](../frontend/src/components/pharmacy/UsageDashboard.tsx).

## Work outside the original phase list

The current code also includes prescription-linked treatment plans, blocks and scheduled sessions, therapist feedback, doctor review tasks, role-specific follow-up queues, reminder emails, external Ruthva journeys, webhook sync, demo clinics, and feedback submission with GitHub issue sync.

**Evidence:** [Treatment API](../backend/treatments/views.py), [follow-up queues](../backend/config/views.py), [reminder command](../backend/reminders/management/commands/send_followup_reminders.py), [Ruthva integration](../backend/integrations/services.py), [demo setup](../backend/users/demo.py), and [feedback API](../backend/feedback/views.py).

## Remaining work

These items distinguish current implementation gaps, product decisions, and deployment verification.

- [ ] Decide whether to implement the missing `/auth/sso/exchange/` route or remove the disconnected `/sso` flow. The frontend calls the route, but current auth routes do not register it.
- [ ] Reconcile the public INR 999 per month offer, unlimited-patient claim, and 14-day trial with the current capacity rules and deferred subscription implementation.
- [ ] Verify diagnostic migration application and retained data in the target database.
- [ ] Verify configured email, logo storage, prescription PDF, reminder scheduling, Ruthva API and webhooks, and GitHub feedback sync in the target environment.
- [ ] Reconcile planned-session editing controls for admins. The API allows doctors and admins, while the reviewed Follow-ups editor is enabled for doctors.

**Evidence:** [SSO page](../frontend/src/app/sso/page.tsx), [auth routes](../backend/users/urls.py), [public pricing](../frontend/src/components/landing/Pricing.tsx), [plan limits](../backend/clinics/plan_limits.py), [session API](../backend/treatments/views.py), and [Follow-ups page](../frontend/src/app/(dashboard)/follow-ups/page.tsx).

Deferred product requirements remain PAY-01 through PAY-03, multi-clinic membership, and direct Google Sheets import. Historical prescribing suggestions and staff profile pictures remain recorded requests in [TO-DOS.md](../TO-DOS.md). Restoring retired history import flows requires a new scope decision.

## Progress

| Phase | Current implementation status | Verification limit |
|---|---|---|
| 1. Foundation | Implemented | Runtime and tenant routing not tested in this review |
| 2. Team and roles | Implemented | Invitation delivery and target runtime not tested |
| 3. Branding and settings | Implemented with revised upload scope | Configured storage and output not tested |
| 4. Data portability | Revised scope implemented | Three original import requirements retired |
| 5. Multi-discipline | Implemented | Production migration state unverified |
| 6. Pharmacy and usage | Implemented | Target runtime not tested; subscriptions deferred |

Review date is 2026-10-03. This date records the source review, not a release or deployment date.
