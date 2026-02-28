# Requirements: AYUSH SaaS Multi-Tenant Clinic Platform

**Defined:** 2026-02-28
**Core Value:** Any AYUSH clinic can sign up, get a subdomain, and immediately manage their patients with complete data isolation.

## v1 Requirements

Requirements for launch readiness. Each maps to roadmap phases.

### Team Management

- [x] **TEAM-01**: Clinic owner can view list of all clinic members with their roles
- [x] **TEAM-02**: Clinic owner can invite a new member by email (sends invite via Resend)
- [x] **TEAM-03**: Clinic owner can update a member's role (doctor/therapist/admin)
- [x] **TEAM-04**: Clinic owner can remove a member from the clinic

### Permissions

- [x] **PERM-01**: ViewSets enforce role-based access (IsDoctor, IsClinicMember permissions)

### Branding

- [ ] **BRND-01**: Clinic owner can upload a logo (max 200KB, 400x400px, PNG/JPEG) stored in S3/R2
- [ ] **BRND-02**: Uploaded logo appears in prescription PDF header and sidebar
- [ ] **BRND-03**: Clinic owner can edit clinic settings (name, address, phone, email, tagline, primary color)
- [ ] **BRND-04**: Clinic owner can toggle paper size (A4/A5) with print preview

### Data Import

- [ ] **IMPT-01**: User can import consultations from CSV with preview/validate/confirm flow
- [ ] **IMPT-02**: User can import prescriptions from CSV with medication rows and preview/validate/confirm flow
- [ ] **IMPT-03**: Import enforces correct order (patients first, then consultations, then prescriptions)

### Data Export

- [ ] **EXPT-01**: User can export all patients as CSV
- [ ] **EXPT-02**: User can export all consultations as CSV with patient reference
- [ ] **EXPT-03**: User can export all prescriptions as CSV with consultation reference and medications
- [ ] **EXPT-04**: User can export all clinic data as a single ZIP file containing all CSVs

### Multi-Discipline

- [ ] **DISC-01**: Consultation model stores discipline-specific diagnostics in JSONField instead of hardcoded Envagai Thervu columns
- [ ] **DISC-02**: Data migration moves existing Envagai Thervu data from columns to JSON (3-step: add field, migrate, drop)
- [ ] **DISC-03**: Frontend renders discipline-specific diagnostic form based on clinic's discipline setting
- [ ] **DISC-04**: Ayurveda clinics see Prakriti analysis form in consultations

### Pharmacy

- [ ] **PHRM-01**: Clinic can maintain a medicine catalog with name, category, dosage forms, and unit price
- [ ] **PHRM-02**: Clinic can track medicine stock levels (quantity on hand, reorder level)
- [ ] **PHRM-03**: System shows low-stock alerts when medicine inventory falls below reorder level
- [ ] **PHRM-04**: Prescription form auto-suggests medicines from the clinic's catalog when typing drug name
- [ ] **PHRM-05**: User can record which medicines were dispensed to a patient after a prescription is created

### Billing & Usage

- [ ] **BILL-01**: Patient model has `is_archived` field to distinguish active vs archived patients
- [ ] **BILL-02**: System enforces active patient limit per clinic (default 200)
- [ ] **BILL-03**: Clinic owner can view usage dashboard showing active patient count, limit, and usage percentage

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Payments

- **PAY-01**: Clinic owner can subscribe to a plan via Razorpay
- **PAY-02**: System handles subscription lifecycle (create, renew, cancel)
- **PAY-03**: System enforces plan limits based on subscription tier

### Team Enhancements

- **TEAM-05**: User can belong to multiple clinics via ClinicMembership junction table
- **TEAM-06**: Role indicator displayed in sidebar showing current user's role

### Import Enhancements

- **IMPT-04**: User can import data directly from Google Sheets URL (OAuth2 flow)
- **IMPT-05**: Frontend import wizard UI for patient CSV import (currently backend-only)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time chat | Not core to clinic management workflow |
| Patient-facing portal | Clinics manage patients, not the reverse |
| Schema-per-tenant | Overkill for current scale; shared-schema locked in Phase 1 |
| Google OAuth login | Email/password sufficient for AYUSH practitioners |
| Mobile native app | Web-first; responsive design covers mobile use |
| Multi-branch clinics | Premature complexity; single location per clinic for now |
| Google Sheets import | Simpler to instruct users to export Sheets as CSV |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEAM-01 | Phase 2 | Complete |
| TEAM-02 | Phase 2 | Complete |
| TEAM-03 | Phase 2 | Complete |
| TEAM-04 | Phase 2 | Complete |
| PERM-01 | Phase 2 | Complete |
| BRND-01 | Phase 3 | Pending |
| BRND-02 | Phase 3 | Pending |
| BRND-03 | Phase 3 | Pending |
| BRND-04 | Phase 3 | Pending |
| IMPT-01 | Phase 4 | Pending |
| IMPT-02 | Phase 4 | Pending |
| IMPT-03 | Phase 4 | Pending |
| EXPT-01 | Phase 4 | Pending |
| EXPT-02 | Phase 4 | Pending |
| EXPT-03 | Phase 4 | Pending |
| EXPT-04 | Phase 4 | Pending |
| DISC-01 | Phase 5 | Pending |
| DISC-02 | Phase 5 | Pending |
| DISC-03 | Phase 5 | Pending |
| DISC-04 | Phase 5 | Pending |
| PHRM-01 | Phase 6 | Pending |
| PHRM-02 | Phase 6 | Pending |
| PHRM-03 | Phase 6 | Pending |
| PHRM-04 | Phase 6 | Pending |
| PHRM-05 | Phase 6 | Pending |
| BILL-01 | Phase 6 | Pending |
| BILL-02 | Phase 6 | Pending |
| BILL-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation — all 28 requirements mapped to Phases 2-6*
