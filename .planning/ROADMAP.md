# Roadmap: AYUSH SaaS Multi-Tenant Clinic Platform

## Overview

Phase 1 (multi-tenant foundation, auth, tenant isolation, CSV patient import, dynamic PDF) is complete and live. Phases 2–6 build the remaining capabilities needed for launch readiness: team management, clinic branding, data portability, multi-discipline diagnostic forms, pharmacy inventory, and usage limits.

## Phases

**Phase Numbering:**
- Phase 1: Complete (multi-tenant foundation)
- Phases 2–6: Remaining launch-readiness work

- [x] **Phase 1: Foundation** - Multi-tenant core, auth, tenant isolation, CSV patient import, dynamic PDF (COMPLETE)
- [x] **Phase 2: Team & Roles** - Clinic owner can invite members and enforce role-based access (COMPLETE)
- [ ] **Phase 3: Branding & Settings** - Logo upload to R2, editable clinic settings, print preview
- [ ] **Phase 4: Data Portability** - Full CSV import for consultations/prescriptions, complete CSV/ZIP export
- [ ] **Phase 5: Multi-Discipline** - Abstract diagnostic forms with JSONField migration and Ayurveda Prakriti support
- [ ] **Phase 6: Pharmacy & Usage** - Medicine catalog, stock tracking, prescription auto-suggest, active patient billing limits

## Phase Details

### Phase 1: Foundation
**Goal**: Multi-tenant SaaS platform is live with authentication, data isolation, and patient onboarding
**Depends on**: Nothing (complete)
**Requirements**: Custom User model, Clinic model, tenant FK, middleware, JWT auth, frontend auth flow, dynamic PDF, CSV patient import
**Success Criteria** (what must be TRUE):
  1. Any clinic can sign up and get a subdomain
  2. Users can log in and access only their clinic's data
  3. Patients can be imported from CSV with preview and validation
  4. Prescriptions generate PDFs with dynamic clinic branding
**Plans**: Complete

### Phase 2: Team & Roles
**Goal**: Clinic owners can build and manage their team, and every action is gated by the caller's role
**Depends on**: Phase 1
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, PERM-01
**Success Criteria** (what must be TRUE):
  1. Clinic owner can see a list of all clinic members with their roles
  2. Clinic owner can invite a new member by email and that person receives an invitation via email
  3. Clinic owner can change a member's role (doctor/therapist/admin) and the change takes effect immediately
  4. Clinic owner can remove a member and that member can no longer access the clinic
  5. A non-owner user is blocked from performing actions restricted to doctors or admins
**Plans**: Complete — PR #13
**Delivered**: ClinicInvitation model, permission classes (IsClinicMember, IsClinicOwner, IsDoctorOrReadOnly), Team API, invite email via Resend, /team page with invite modal, /invite/accept page, role-based enforcement on all ViewSets

### Phase 3: Branding & Settings
**Goal**: Clinic owners can fully customize their clinic's identity as it appears in the app, PDFs, and print output
**Depends on**: Phase 2
**Requirements**: BRND-01, BRND-02, BRND-03, BRND-04
**Success Criteria** (what must be TRUE):
  1. Clinic owner can upload a logo (max 200KB, 400x400px, PNG/JPEG) and it is stored in Cloudflare R2
  2. The uploaded logo appears in the prescription PDF header and in the app sidebar
  3. Clinic owner can edit clinic settings (name, address, phone, email, tagline, primary color) and changes are reflected immediately
  4. Clinic owner can toggle paper size between A4 and A5 and see a print preview of the prescription
**Plans**: TBD

### Phase 4: Data Portability
**Goal**: Clinics can import their full historical data and export everything for backup or migration
**Depends on**: Phase 2
**Requirements**: IMPT-01, IMPT-02, IMPT-03, EXPT-01, EXPT-02, EXPT-03, EXPT-04
**Success Criteria** (what must be TRUE):
  1. User can upload a consultations CSV, see a preview with validation errors highlighted, and confirm the import
  2. User can upload a prescriptions CSV with medication rows, see a preview with validation errors, and confirm the import
  3. Import rejects prescriptions before their referenced consultations exist, and consultations before their referenced patients exist
  4. User can download all patients, consultations, or prescriptions as individual CSV files
  5. User can download a single ZIP file containing all clinic data as separate CSVs
**Plans**: TBD

### Phase 5: Multi-Discipline
**Goal**: The platform supports all five AYUSH disciplines with the right diagnostic form shown per clinic
**Depends on**: Phase 4
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04
**Success Criteria** (what must be TRUE):
  1. Consultation model stores diagnostic data in a JSONField, and existing Siddha Envagai Thervu data is migrated without loss
  2. A Siddha clinic sees the Envagai Thervu diagnostic fields in the consultation form
  3. An Ayurveda clinic sees the Prakriti analysis form in the consultation form
  4. A clinic using a discipline other than Siddha or Ayurveda sees a generic diagnostic notes field
**Plans**: TBD

### Phase 6: Pharmacy & Usage
**Goal**: Clinics can manage medicine inventory and the system enforces active patient limits per plan
**Depends on**: Phase 5
**Requirements**: PHRM-01, PHRM-02, PHRM-03, PHRM-04, PHRM-05, BILL-01, BILL-02, BILL-03
**Success Criteria** (what must be TRUE):
  1. Clinic can add medicines to a catalog with name, category, dosage forms, and unit price
  2. Clinic can record stock levels and the system shows a low-stock alert when quantity falls below reorder level
  3. When creating a prescription, typing a drug name auto-suggests matching medicines from the clinic's own catalog
  4. User can record which medicines were dispensed after a prescription is created
  5. Clinic owner can view a usage dashboard showing active patient count, limit, and percentage used
  6. System blocks creating a new active patient when the clinic has reached its active patient limit
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | - | Complete | 2026-02-28 |
| 2. Team & Roles | 1/1 | Complete | 2026-02-28 |
| 3. Branding & Settings | 0/? | Not started | - |
| 4. Data Portability | 0/? | Not started | - |
| 5. Multi-Discipline | 0/? | Not started | - |
| 6. Pharmacy & Usage | 0/? | Not started | - |
