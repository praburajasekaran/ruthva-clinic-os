# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Incomplete Feature: Medicine Master Database & Inventory**
- Issue: Medicines are stored as free-text entries only (`drug_name` in `Medication` model at `backend/prescriptions/models.py:53`). No master medicine database, inventory tracking, pricing, or autocomplete functionality exists.
- Files: `backend/prescriptions/models.py:40-67`, `frontend/src/components/prescriptions/PrescriptionBuilder.tsx`, `frontend/src/components/prescriptions/MedicationRow.tsx`
- Impact: Doctors must manually type medicine names every time, leading to inconsistencies, spelling variations, and inability to reuse formulations. No inventory management limits clinic scalability.
- Fix approach: Create new `pharmacy` Django app with `Medicine` model (name, name_ta, category, form/type, manufacturer, unit, price, stock_quantity, reorder_level). Add CRUD API endpoints. Integrate medicine search/autocomplete in prescription builder with frequency-based suggestions.

**Missing Drug History Autosuggest**
- Issue: When doctors prescribe a drug, they must manually re-enter dosage, frequency, duration, and instructions each time, even if they've prescribed the same drug before.
- Files: `backend/prescriptions/models.py:40-67`, `frontend/src/components/prescriptions/MedicationRow.tsx`, `frontend/src/lib/api.ts`
- Impact: Slow prescription entry workflow, increased manual data entry errors, no learning from historical prescription patterns.
- Fix approach: Add backend API endpoint that returns most frequently used dosage/frequency/duration/instructions for a drug from past prescriptions. On frontend, auto-populate `MedicationRow` fields with suggestions doctor can accept or override.

**User Profile Picture Missing**
- Issue: `User` model at `backend/users/models.py` has no profile picture field at all (`profile_pic`, `avatar`, or photo field). No image upload endpoint exists.
- Files: `backend/users/models.py:5-27`, `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/components/layout/Sidebar.tsx`
- Impact: No visual identification in multi-doctor clinics, no avatar for UI personalization, can't display user photos on prescription letterheads.
- Fix approach: Add `profile_pic` ImageField to User model (or URL field for S3/external storage). Add multipart upload endpoint. Build settings page with preview/crop UI. Display avatar in sidebar and everywhere user identity is shown. Fall back to initials-based avatar when missing.

**Incomplete Clinic Signup Form**
- Issue: Signup form at `frontend/src/app/signup/page.tsx` only collects clinic name, email, password, subdomain. Missing doctor salutation (Dr, Prof), qualifications (BSMS, MD), registration number, clinic address, and logo.
- Files: `frontend/src/app/signup/page.tsx:24-93`, `frontend/src/lib/types.ts:20-41`, `frontend/src/lib/api.ts`, `backend/clinics/models.py:4-35`
- Impact: Incomplete clinic profile data needed for professional letterheads, prescription authentication, and clinic identity.
- Fix approach: Add form fields for salutation (dropdown), qualification (text), registration_number (text), address (textarea), logo (file upload). Update `Clinic` type to include `doctor_salutation`, `doctor_qualification`, `registration_number`. Backend schema may need migration.

**Terminology Mismatch for Ayurveda**
- Issue: Consultation form uses mixed modern medical and traditional terminology. Labels like "Appetite/பசி" and "General Assessment" don't align with proper Ayurvedic terminology needed for Ayurveda-specific version.
- Files: `frontend/src/components/consultations/ConsultationForm.tsx`, `frontend/src/components/consultations/EnvagaiThervu.tsx`, `frontend/src/lib/constants/bilingual-labels.ts`, `frontend/src/lib/constants/envagai-options.ts`, `frontend/src/lib/types.ts`
- Impact: Inconsistent user experience across Siddha and Ayurveda versions. Doctors see non-standard terminology for their discipline.
- Fix approach: Review each form section and update labels to use proper Ayurvedic equivalents while maintaining bilingual (Tamil/English) approach. May need separate label sets for Ayurveda vs Siddha versions, or discipline-aware label selection at form render time.

## Known Bugs

**Token Refresh Not Implemented**
- Symptoms: JWT access tokens expire and users get logged out without graceful refresh. No refresh token flow is implemented in the frontend.
- Files: `frontend/src/lib/api.ts:27-43`, `frontend/src/components/auth/AuthProvider.tsx:61-86`
- Trigger: Wait for JWT token expiry (typically 15-60 min depending on backend config). User tries to make API call after expiry.
- Workaround: User manually logs out and logs back in.

**Clinic Subdomain Not Validated on Frontend**
- Symptoms: Signup form accepts any subdomain. No validation for DNS conflicts, length, or reserved keywords.
- Files: `frontend/src/app/signup/page.tsx`
- Trigger: User enters invalid subdomain like "a" or "admin" or "-invalid-".
- Workaround: Backend may reject, but no user feedback on frontend.

## Security Considerations

**Tokens Stored in LocalStorage**
- Risk: Access and refresh tokens stored in `localStorage` are vulnerable to XSS attacks. If attacker injects malicious JS, tokens can be stolen.
- Files: `frontend/src/components/auth/AuthProvider.tsx:64-65`, `78-79`, `frontend/src/lib/api.ts:13-15`
- Current mitigation: None observed. No httpOnly cookies or secure storage mechanisms.
- Recommendations: Move tokens to httpOnly, Secure cookies instead of localStorage. Requires backend to set `Set-Cookie` headers. Alternatively, use `sessionStorage` for access token (cleared on browser close) and httpOnly cookie for refresh token.

**Clinic Slug Stored in LocalStorage**
- Risk: `clinic_slug` stored in localStorage (`frontend/src/lib/api.ts:19-22`, `frontend/src/components/auth/AuthProvider.tsx:46`, `67`, `81`) can be modified by malicious JS. Cross-clinic data leaks possible if not validated server-side.
- Files: `frontend/src/lib/api.ts:19-22`, `frontend/src/components/auth/AuthProvider.tsx`, `backend/clinics/middleware.py` (validation)
- Current mitigation: `TenantJWTAuthentication` at `backend/users/authentication.py:5-19` cross-validates token clinic_id against request clinic, so server-side validation exists.
- Recommendations: Verify clinic validation is applied to ALL endpoints. Consider storing clinic context in JWT token claims instead of localStorage to reduce client-side tampering vectors.

**No CSRF Token in API**
- Risk: API endpoints may be vulnerable to CSRF if frontend doesn't send CSRF tokens with state-changing requests.
- Files: `frontend/src/lib/api.ts`, `backend/config/settings/base.py:36-46`
- Current mitigation: Django includes CSRF middleware, but frontend axios client doesn't explicitly include CSRF token.
- Recommendations: Add CSRF token to axios request headers. Check `X-CSRFToken` header is being sent with POST/PUT/DELETE requests.

**No Input Validation on Medical Data**
- Risk: Free-text fields for diagnosis, chief complaints, envagai tervu observations have no validation. Injection attacks possible if data is later rendered unsanitized.
- Files: `backend/consultations/models.py:80-84`, `backend/prescriptions/models.py:15-23`, `69-75`
- Current mitigation: None observed. TextFields accept arbitrary input.
- Recommendations: Sanitize user input on backend before storing. Validate/escape on frontend before rendering. Use parameterized queries (Django ORM does this, but ensure it's not bypassed).

**Email Addresses Not Validated on Patient**
- Risk: Patient email at `backend/patients/models.py:38` is optional and unvalidated. Invalid emails in `SentReminder.patient_email` at `backend/reminders/models.py:15` could cause email delivery failures.
- Files: `backend/patients/models.py:38`, `backend/reminders/models.py:15`
- Current mitigation: Django EmailField provides basic format validation, but no domain existence check.
- Recommendations: Add email validation/verification flow for patients before storing. Implement email bounce handling in reminder system.

**No Password Reset Flow**
- Risk: Users who forget passwords have no recovery mechanism visible in code.
- Files: `frontend/src/app/login/page.tsx`
- Current mitigation: Unknown. Backend may have password reset endpoints, but frontend doesn't expose UI for it.
- Recommendations: Implement forgot-password flow with secure token-based reset email. Add frontend page at `/password-reset/` and `/reset-token/:token/`.

**No Rate Limiting on Auth Endpoints**
- Risk: Brute force attacks possible on login and signup endpoints.
- Files: `backend/users/views.py` (not examined in detail), `frontend/src/app/login/page.tsx`, `frontend/src/app/signup/page.tsx`
- Current mitigation: Unknown. Django has optional throttling via DRF.
- Recommendations: Enable DRF throttling on auth endpoints. Implement progressive delays after failed attempts.

## Performance Bottlenecks

**Patient Record ID Generation Uses Unoptimized Query**
- Problem: Every patient save performs a database query to find the last record ID for the clinic/year (`backend/patients/models.py:90-96`). This query is O(N) when there's no index.
- Files: `backend/patients/models.py:83-103`
- Cause: Query uses `order_by("-record_id").first()` without ordering by numeric value. Record IDs are strings like "PAT-2026-0001", so sorting is lexicographic. Also, query may scan many records per clinic.
- Improvement path: Add a more efficient counter table (e.g., `ClinicYearCounter`) that increments. Or use database sequence. Use select_for_update() more efficiently (already in place, but could be optimized with direct counter increment).

**No Pagination on Patient/Consultation Lists**
- Problem: UI likely loads all patients/consultations for a clinic into memory. No limit observed in API endpoint design.
- Files: `backend/patients/views.py` (assumed), `backend/consultations/views.py` (assumed)
- Cause: No explicit limit/offset parameters visible in API client or views examined.
- Improvement path: Implement DRF pagination with reasonable page size (e.g., 20-50). Add `LimitOffsetPagination` or `PageNumberPagination`. Expose page size in frontend UI. Implement infinite scroll or "Load More" button.

**No Database Query Optimization (N+1)**
- Problem: Loading consultations with related patient/clinic data likely triggers N+1 queries (one per consultation, then one per patient).
- Files: `backend/consultations/models.py:8-22`, `backend/consultations/views.py` (not examined)
- Cause: Django ORM lazy-loading relationships. No `select_related` or `prefetch_related` visible in views.
- Improvement path: Add `select_related('patient', 'clinic')` in consultation querysets. Benchmark query count with Django Debug Toolbar.

**Frontend Re-renders on Every State Change**
- Problem: Form components may re-render unnecessarily when reducer updates state in `PrescriptionBuilder.tsx`.
- Files: `frontend/src/components/prescriptions/PrescriptionBuilder.tsx:1-150+`
- Cause: All medications and procedures re-render when one field changes. State is not granular enough.
- Improvement path: Split medication/procedure state into separate contexts or use more granular state management (e.g., Zustand, Jotai). Add `React.memo` to `MedicationRow`, `ProcedureRow` components. Profile with React DevTools.

## Fragile Areas

**TenantMiddleware Assumes Clinic Always Present**
- Files: `backend/clinics/middleware.py` (not examined), `backend/users/authentication.py:5-19`
- Why fragile: `TenantJWTAuthentication` retrieves clinic from request object without null checks. If middleware doesn't set it for some endpoints, authentication could fail or cause exceptions.
- Safe modification: Add null checks in authentication class. Ensure middleware is tested with public endpoints (login, signup). Document which views require clinic context.
- Test coverage: Middleware tests missing or not examined.

**Consultation Form State Coupling**
- Files: `frontend/src/components/consultations/ConsultationForm.tsx`, `frontend/src/lib/constants/bilingual-labels.ts`, `frontend/src/lib/types.ts`
- Why fragile: Form uses hardcoded bilingual labels and enum choices. If types or labels change, form breaks silently. Adding new envagai thervu fields requires changes in multiple places (types, labels, form component, API).
- Safe modification: Extract form schema (labels, fields, choices) into a separate config file or API. Use a form builder library (e.g., React Hook Form with dynamic fields). Generate types from schema.
- Test coverage: No unit tests visible for form validation or field rendering.

**Direct localStorage Access Without Abstraction**
- Files: `frontend/src/lib/api.ts:13-22`, `frontend/src/components/auth/AuthProvider.tsx:37-52`
- Why fragile: localStorage is accessed directly from multiple files. If storage mechanism changes (e.g., to cookies), many files need updates. No error handling if storage is full or disabled.
- Safe modification: Create a `storage.ts` utility module with `getToken()`, `setToken()`, `removeToken()` functions. Use that everywhere instead of direct localStorage calls.
- Test coverage: No unit tests for storage logic.

**Prescription One-to-One with Consultation**
- Files: `backend/prescriptions/models.py:10-14`
- Why fragile: `OneToOneField` means each consultation can have max one prescription. If system later needs multiple prescriptions per consultation (e.g., follow-up prescriptions), schema breaks. No migrations path visible.
- Safe modification: Change to `ForeignKey` instead of `OneToOneField` to allow multiple prescriptions. Update views/serializers accordingly. Write data migration to handle existing one-to-one relationships.
- Test coverage: No tests visible for prescription creation validation.

## Scaling Limits

**Active Patient Limit Not Enforced**
- Resource: `Clinic.active_patient_limit` at `backend/clinics/models.py:29` defaults to 200 patients per clinic.
- Limit: No enforcement mechanism visible in code. Clinics can likely exceed limit without error.
- Scaling path: Add validation in `Patient.save()` to check clinic's active patient count before allowing new patient creation. Implement soft limit (warning) vs hard limit (error).

**Subdomain as String Lookup**
- Resource: Clinic lookup by `subdomain` at `backend/clinics/models.py:18` is string slug field.
- Limit: Works fine at small scale, but verbose in URLs (e.g., `sivanethram.example.com`). No multi-level subdomain support (e.g., `clinic.user.example.com`).
- Scaling path: If multi-tenancy grows, consider UUID-based URLs internally with subdomain mapping in DNS/reverse proxy. Or use path-based tenancy (e.g., `/sivanethram/patients/`).

**No Caching on Clinic/Patient Data**
- Resource: Every API request re-queries clinic info and patient lists from database.
- Limit: High database load at scale with many clinics/patients.
- Scaling path: Add Redis caching for clinic info, patient lists, and prescription history. Invalidate cache on updates. Implement client-side caching in frontend (React Query, SWR).

**Email Reminders Are Synchronous**
- Resource: Follow-up reminder command at `backend/reminders/management/commands/send_followup_reminders.py` likely sends emails synchronously.
- Limit: If clinic has 1000 patients with follow-ups, sending 1000 emails serially will block. Email service timeouts will cause failures.
- Scaling path: Move to async task queue (Celery + Redis/RabbitMQ). Send emails in background job with retry logic.

## Dependencies at Risk

**Resend Email Service Dependency**
- Risk: Email reminders depend on Resend.com API (from commit ce6a259). If service goes down or API changes, reminders stop working. No fallback email provider.
- Impact: Patients won't receive follow-up reminders, impacting clinic operations and patient care continuity.
- Migration plan: Implement email provider abstraction with multiple backends (Resend, SendGrid, AWS SES). Use strategy pattern to switch providers. Add configuration option to select provider per clinic.

**No Version Pinning on Core Dependencies**
- Risk: `package.json` and `requirements.txt` (not examined) may use loose version specs (e.g., `^1.0.0`). Breaking changes in minor updates could break app.
- Impact: Unpredictable deployments, hard-to-reproduce bugs in production.
- Migration plan: Lock all dependency versions in lockfiles (`package-lock.json`, `poetry.lock`). Review major version updates quarterly. Implement automated dependency update checks (Dependabot).

## Test Coverage Gaps

**No Tests for Patient Record ID Generation**
- What's not tested: Concurrent patient creation, record ID uniqueness, year rollover scenario.
- Files: `backend/patients/models.py:83-103`, `backend/patients/tests.py` (probably empty)
- Risk: Record ID generation logic could fail silently under high concurrency, duplicate IDs possible.
- Priority: High

**No Tests for Consultation Form Submission**
- What's not tested: All form fields, bilingual label rendering, envagai thervu validation, image/file uploads if any.
- Files: `frontend/src/components/consultations/ConsultationForm.tsx`, `frontend/src/app/(dashboard)/patients/[id]/consultations/new/page.tsx`
- Risk: Form regressions undetected. Missing fields won't be caught.
- Priority: High

**No Tests for Prescription Builder**
- What's not tested: Adding/removing medications, changing dosages, saving prescriptions, follow-up date validation.
- Files: `frontend/src/components/prescriptions/PrescriptionBuilder.tsx`, `frontend/src/components/prescriptions/MedicationRow.tsx`
- Risk: Prescription data corruption undetected. Doctors may save incomplete prescriptions.
- Priority: High

**No Tests for Multi-Clinic Isolation**
- What's not tested: Clinic A can't access Clinic B's patients/consultations/prescriptions. TenantMiddleware enforces isolation correctly.
- Files: `backend/clinics/middleware.py`, `backend/users/authentication.py:5-19`, all views
- Risk: Critical security issue. Data leaks between clinics possible if authentication is bypassed.
- Priority: Critical

**No Tests for Email Reminder Deduplication**
- What's not tested: Reminders not sent twice for same follow-up date, unique constraint on `SentReminder` model.
- Files: `backend/reminders/models.py:23-29`, `backend/reminders/management/commands/send_followup_reminders.py`
- Risk: Patients receive duplicate emails, email service quota exhausted.
- Priority: Medium

**No Tests for Auth Token Refresh**
- What's not tested: JWT token expiry and refresh flow (if implemented).
- Files: `backend/users/authentication.py`, `frontend/src/components/auth/AuthProvider.tsx`
- Risk: Users randomly logged out in production when tokens expire.
- Priority: High

**No Integration Tests for Patient Import**
- What's not tested: Patient CSV/bulk import flow, data validation, clinic isolation during import.
- Files: `backend/patients/import_service.py`
- Risk: Bulk import could corrupt or leak patient data.
- Priority: Medium

---

*Concerns audit: 2026-02-28*
