# Requirements: AYUSH SaaS Multi-Tenant Clinic Platform

**Defined:** 2026-02-28.
**Implementation review:** 2026-10-03.
**Core value:** AYUSH clinics manage patients and clinical care within their clinic's data boundary.

A checked requirement means its implementation exists in the reviewed source. It does not confirm deployment, production data migration, or external service operation. Retired requirements remain unchecked for historical traceability and are excluded from active scope.

The original v1 list has 28 requirements. Implementation exists for 25. Three are retired. Evidence and phase details are in [ROADMAP.md](ROADMAP.md).

## v1 Requirements

### Team management

- [x] **TEAM-01**: Clinic owners can view members and their roles.
- [x] **TEAM-02**: Clinic owners can invite a member by email. Sending uses the configured email provider. Delivery is unverified in this review.
- [x] **TEAM-03**: Clinic owners can update a member's doctor, therapist, or admin role.
- [x] **TEAM-04**: Clinic owners can remove a member.

### Permissions

- [x] **PERM-01**: The API enforces clinic membership, owner access, doctor clinical writes, and operation-specific role checks.

IsClinicMember, IsClinicOwner, and IsDoctorOrReadOnly are the shared permission classes. Session feedback also checks for the therapist role. Clinic owner is a separate flag from staff role.

### Branding

- [x] **BRND-01**: Clinic owners can upload a PNG or JPEG logo with a 2 MB byte limit through the configured Django storage backend.
- [x] **BRND-02**: Clinic logo fields are used in the prescription header and sidebar.
- [x] **BRND-03**: Clinic owners can edit clinic details, address, contact information, tagline, and primary color.
- [x] **BRND-04**: Clinic owners can select A4 or A5 paper. Prescriptions have a browser print view and a PDF path.

BRND-01 now reflects the current upload contract. The original 200 KB and 400x400 pixel limit is superseded. The current endpoint does not enforce that pixel limit. Configured storage and rendered output require runtime verification.

### Data Import

- [ ] **IMPT-01**: Retired. Separate consultation CSV import with preview, validation, and confirmation was deliberately removed.
- [ ] **IMPT-02**: Retired. Separate prescription CSV import with medication rows was deliberately removed.
- [ ] **IMPT-03**: Retired. The import-order requirement depended on those removed consultation and prescription import flows.

The [completed removal plan](../docs/plans/2026-03-18-refactor-remove-settings-import-ui-plan.md) records the 2026-03-18 decision. The current consultation and prescription routes do not expose these import actions. Patient CSV import remains at `/patients/import`.

Patient import can create one baseline consultation when diagnosis is supplied. It is not a replacement for importing a full clinical history. A next_review_date queues external Ruthva sync when configured, rather than creating a local prescription follow-up.

### Data export

- [x] **EXPT-01**: Clinic owners can export patient CSV records.
- [x] **EXPT-02**: Clinic owners can export consultations with patient references.
- [x] **EXPT-03**: Clinic owners can export prescriptions with consultation references, medication rows, and procedure rows.
- [x] **EXPT-04**: Clinic owners can download a ZIP containing `patients.csv`, `consultations.csv`, and `prescriptions.csv`.

EXPT-04 reflects the implemented export scope. These CSVs omit other tables and some model fields. The ZIP is not a complete clinic backup or a lossless import and export format. Export endpoints are owner-only and record an export audit.

### Multi-discipline

- [x] **DISC-01**: Consultation diagnostic data uses a JSONField instead of the legacy Envagai columns.
- [x] **DISC-02**: Migrations 0004, 0005, and 0006 implement field addition, legacy data copy, and column removal. Production application and retained data are unverified.
- [x] **DISC-03**: The frontend selects the diagnostic form from the clinic discipline.
- [x] **DISC-04**: Ayurveda clinics receive the Prakriti form.

Siddha uses Envagai Thervu. Homeopathy uses structured case taking. Unani and Yoga & Naturopathy use generic notes. The migration source includes a count check and a reverse copy operation. This review did not run it against a database.

### Pharmacy

- [x] **PHRM-01**: The clinic medicine catalog stores name, Tamil name, brand, category, dosage form, and unit price.
- [x] **PHRM-02**: The clinic records total stock, reorder level, and stock movement history.
- [x] **PHRM-03**: Active medicines at or below the reorder level appear in low-stock alerts.
- [x] **PHRM-04**: Prescription medication rows suggest medicines from the clinic's catalog.
- [x] **PHRM-05**: Clinic members can record dispensing against a prescription. The API deducts stock and rejects insufficient quantities.

Batch number and expiry date are stored on stock entries. The reviewed dispensing flow uses the medicine's total stock. Batch selection, per-batch remaining balances, and expiry-based dispensing are not established by that flow. Catalog autocomplete does not implement suggestions based on earlier prescribing instructions.

### Billing and usage

- [x] **BILL-01**: Patient.is_active distinguishes active and archived patients. The implementation uses this flag instead of the proposed is_archived field.
- [x] **BILL-02**: Patient creation, import, and reactivation check Clinic.active_patient_limit, which defaults to 200.
- [x] **BILL-03**: Clinic owners can view active patient count, capacity, usage percentage, medicine count, and low-stock count.

The Free role limits are one doctor, one therapist, and one admin. Pending invitations count toward each role limit. The plan table also contains Pro values. A paid subscription lifecycle and automatic subscription-driven capacity updates are not established by these rules.

## Previously deferred, now implemented

These two requirements retain their original IDs. They are outside the original 28-item v1 count.

- [x] **TEAM-06**: The sidebar shows the current user's role.
- [x] **IMPT-05**: Patient CSV import has a frontend wizard with a template, validation preview, confirmation, and results.

Evidence is in the [sidebar](../frontend/src/components/layout/Sidebar.tsx) and [patient import page](../frontend/src/app/(dashboard)/patients/import/page.tsx).

## v2 Requirements

These requirements remain deferred. Their presence does not authorize implementation in this documentation update.

### Payments

- [ ] **PAY-01**: Clinic owners can subscribe through Razorpay.
- [ ] **PAY-02**: The system handles subscription creation, renewal, and cancellation.
- [ ] **PAY-03**: Subscription changes update the clinic's effective plan limits.

The public page advertises INR 999 per month, unlimited patient records, and a 14-day trial. These claims need reconciliation with the current limits and deferred payment work.

### Team enhancements

- [ ] **TEAM-05**: A user can belong to multiple clinics through membership records.

### Import enhancements

- [ ] **IMPT-04**: Direct Google Sheets import remains a future idea and is excluded from current release scope.

## Out of Scope

| Feature | Current scope |
|---|---|
| Real-time staff chat | Excluded from clinic management scope |
| Patient-facing portal | Excluded from this clinic application |
| Separate schema or database per tenant | Shared-schema tenancy remains the chosen approach |
| Google OAuth login | Current interface uses email code login |
| Native mobile application | Web application remains the current client |
| Multi-branch clinics | A clinic represents one location |
| Direct Google Sheets import | CSV remains the supported import format |

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| TEAM-01 | Phase 2 | Implemented |
| TEAM-02 | Phase 2 | Implemented; email delivery unverified |
| TEAM-03 | Phase 2 | Implemented |
| TEAM-04 | Phase 2 | Implemented |
| PERM-01 | Phase 2 | Implemented |
| BRND-01 | Phase 3 | Implemented; upload contract revised |
| BRND-02 | Phase 3 | Implemented; rendered output unverified |
| BRND-03 | Phase 3 | Implemented |
| BRND-04 | Phase 3 | Implemented; rendered output unverified |
| IMPT-01 | Phase 4 | Retired on 2026-03-18 |
| IMPT-02 | Phase 4 | Retired on 2026-03-18 |
| IMPT-03 | Phase 4 | Retired on 2026-03-18 |
| EXPT-01 | Phase 4 | Implemented |
| EXPT-02 | Phase 4 | Implemented |
| EXPT-03 | Phase 4 | Implemented |
| EXPT-04 | Phase 4 | Implemented; scope is three clinical CSVs |
| DISC-01 | Phase 5 | Implemented |
| DISC-02 | Phase 5 | Implemented; production migration state unverified |
| DISC-03 | Phase 5 | Implemented |
| DISC-04 | Phase 5 | Implemented |
| PHRM-01 | Phase 6 | Implemented |
| PHRM-02 | Phase 6 | Implemented |
| PHRM-03 | Phase 6 | Implemented |
| PHRM-04 | Phase 6 | Implemented |
| PHRM-05 | Phase 6 | Implemented |
| BILL-01 | Phase 6 | Implemented with is_active |
| BILL-02 | Phase 6 | Implemented with clinic active_patient_limit |
| BILL-03 | Phase 6 | Implemented |

Original v1 coverage is 28 mapped requirements, 25 implemented requirements, three retired requirements, and zero unmapped requirements. TEAM-06 and IMPT-05 are also implemented outside that original count. Deployment and service verification remain in [ROADMAP.md](ROADMAP.md).
