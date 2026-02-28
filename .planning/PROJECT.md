# AYUSH SaaS Multi-Tenant Clinic Platform

## What This Is

A multi-tenant SaaS platform serving all five AYUSH disciplines (Ayurveda, Yoga & Naturopathy, Unani, Siddha, Homeopathy). Each clinic signs up, picks their discipline, gets a subdomain (`myclinic.platform.com`), and manages patients, consultations, and prescriptions within their isolated tenant. Built on Django REST Framework + Next.js with shared-schema multi-tenancy.

## Core Value

Any AYUSH clinic can sign up, get a subdomain, and immediately manage their patients with complete data isolation — no clinic ever sees another clinic's data.

## Requirements

### Validated

<!-- Shipped and confirmed valuable (Phase 1 complete). -->

- Custom User model with clinic FK and role (doctor/therapist/admin)
- Clinic model with discipline, branding fields, subdomain
- Tenant FK (`clinic`) on Patient, Consultation, Prescription models
- Composite indexes on all tenant-scoped query patterns
- Clinic-scoped patient record IDs (PAT-{year}-{NNNN}) with transaction safety
- TenantMiddleware: subdomain resolution with 5-min cache, dev `X-Clinic-Slug` header
- TenantQuerySetMixin: fail-closed (returns `none()` when no clinic context)
- JWT authentication with `clinic_id` cross-validation against subdomain
- Signup flow: creates Clinic + owner User, returns JWT tokens
- Login/logout with token persistence across sessions
- Frontend AuthProvider + AuthGuard with 401 interceptor
- Dynamic clinic name in sidebar, dashboard, page title
- Dynamic PDF branding (clinic name, address, paper size, doctor name)
- Dashboard stats consolidated to 3 queries with tenant filtering
- Follow-ups endpoint bounded by date range
- CSV patient import with preview/validate/confirm flow and duplicate detection
- Denormalized `clinic_id` on Prescription for query performance

### Active

<!-- Current scope: Phases 2-6 for launch readiness. -->

- [ ] Team management: invite members, list/update/remove clinic members
- [ ] Role-based permissions: doctor, therapist, admin enforcement in views
- [ ] Logo upload to S3/R2 with size constraints
- [ ] Clinic settings page: branding, address, color, paper size
- [ ] Full CSV import for consultations and prescriptions
- [ ] Data export: per-entity CSV + full ZIP download
- [ ] Pharmacy: medicine catalog, stock tracking, low-stock alerts, prescription auto-suggest, dispensing records
- [ ] Multi-discipline diagnostic forms (abstract Envagai Thervu to JSON)
- [ ] Ayurveda Prakriti analysis form
- [ ] Billing: active patient counting, limits, Razorpay integration
- [ ] Usage dashboard for clinic owners

### Out of Scope

<!-- Explicit boundaries. -->

- Real-time chat between clinic members — not core to clinic management
- Patient-facing portal — clinics manage patients, not the reverse
- Schema-per-tenant / database-per-tenant — overkill for current scale
- Google OAuth login — email/password sufficient for AYUSH practitioners
- Mobile native app — web-first, responsive design covers mobile use
- Multi-branch clinics (one clinic = multiple locations) — premature complexity

## Context

- **Origin:** Started as a single-tenant Siddha clinic app ("Sivanethram") for one practitioner
- **Phase 1 shipped:** Full multi-tenant foundation is live — custom User, Clinic model, tenant middleware, JWT auth, fail-closed mixin, frontend auth flow, dynamic PDF, CSV import
- **Target market:** Solo/small-clinic AYUSH practitioners (1-3 doctors) in India
- **Existing codebase:** Django 5.1 + DRF backend, Next.js 14 + Tailwind frontend, PostgreSQL database
- **Email service:** Resend SDK for follow-up reminders (already integrated)
- **PDF generation:** WeasyPrint (already integrated with dynamic branding)
- **Brainstorm reference:** `docs/plans/2026-02-27-saas-multi-tenant-brainstorm.md` — deep technical spec with security/performance research

## Constraints

- **Tech stack**: Django 5.1 + DRF backend, Next.js 14 + React 18 frontend — established, not changing
- **Multi-tenancy**: Shared-schema with tenant FK — architecture is locked from Phase 1
- **Icons**: Lucide React for all icon usage
- **Auth**: JWT via SimpleJWT with clinic_id cross-validation — pattern established
- **File storage**: S3/R2 for uploads (Phase 3) — Cloudflare R2 preferred for cost
- **Payments**: Razorpay (Phase 6) — standard for Indian SaaS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Shared-schema multi-tenancy | Simpler ops, easier cross-tenant analytics, sufficient at current scale | Validated |
| Denormalize clinic_id on Prescription | Eliminates 3-4 table joins for prescription queries | Validated |
| Fail-closed tenant mixin (returns none()) | Security-first: missing clinic context never leaks data | Validated |
| JWT cross-validation against subdomain | Prevents token reuse across clinics | Validated |
| Lock clinic row for record ID generation | O(1) contention vs O(n) locking patient rows | Validated |
| Defer Phases 2-6 until demand | YAGNI — Phase 1 foundation first, rest when needed | Revisit (building for launch readiness now) |
| CSV import over Google Sheets API | Simpler, universal format; Sheets users can export to CSV | Validated |

---
*Last updated: 2026-02-28 after project initialization (Phase 1 complete, Phases 2-6 scoped)*
