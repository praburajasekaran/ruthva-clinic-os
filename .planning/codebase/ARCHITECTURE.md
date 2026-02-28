# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Multi-tenant SaaS platform with decoupled frontend and backend

**Key Characteristics:**
- Frontend: Next.js 15 with App Router (client-side components)
- Backend: Django REST Framework with clinic-based multi-tenancy
- Communication: REST API with JWT authentication
- State management: Context API (AuthProvider) + custom hooks for API calls
- Tenant isolation: Subdomain-based clinic routing with middleware enforcement

## Layers

**Presentation Layer:**
- Purpose: User interface and client-side interactions
- Location: `frontend/src/app/`, `frontend/src/components/`
- Contains: Next.js pages, React components, forms, UI elements
- Depends on: API client (`lib/api.ts`), custom hooks, authentication context
- Used by: End users via browser

**Business Logic Layer:**
- Purpose: Clinic management, patient records, consultations, prescriptions
- Location: `backend/[clinics|patients|consultations|prescriptions|users|reminders]/`
- Contains: Django models, ViewSets, serializers, import services
- Depends on: Django ORM, DRF, business-specific mixins
- Used by: REST API consumers

**Data Layer:**
- Purpose: Persistent storage and data integrity
- Location: Database (PostgreSQL implied)
- Contains: Clinic, User, Patient, Consultation, Prescription, MedicalHistory, FamilyHistory, Reminder models
- Depends on: Django ORM, transaction management
- Used by: Business logic layer

**Middleware/Cross-cutting:**
- Purpose: Tenant resolution and enforcement
- Location: `backend/clinics/middleware.py`
- Contains: TenantMiddleware (subdomain/header-based clinic resolution, caching)
- Depends on: Django cache, Clinic model
- Used by: All backend views

**API Integration:**
- Purpose: External service communication
- Location: `backend/reminders/` (Resend email service)
- Contains: Email reminder sending via Resend SDK
- Depends on: External APIs, Django tasks
- Used by: Follow-up reminder system

## Data Flow

**Authentication Flow:**

1. User submits login/signup form on `/login` or `/signup` page
2. `AuthProvider` (React Context) calls `/auth/token/` or `/auth/signup/` endpoint
3. Backend `CustomTokenObtainPairView` validates credentials, creates clinic and user if needed
4. Returns JWT tokens and clinic metadata to frontend
5. Frontend stores tokens in `localStorage` (access_token, refresh_token, clinic_slug)
6. `api.ts` interceptor automatically attaches Bearer token to all requests
7. 401 responses trigger logout and redirect to `/login`

**Patient Management Flow:**

1. User navigates to `/patients` (reads) or `/patients/new` (creates)
2. `useApi()` hook calls `GET /api/v1/patients/` for list with pagination
3. `PatientViewSet` (backend) returns filtered by clinic via `TenantQuerySetMixin`
4. Form submission triggers `useMutation()` to POST/PUT/PATCH
5. Backend validates, saves to database, returns serialized patient
6. Frontend updates state and redirects to patient detail page

**Consultation & Prescription Flow:**

1. From patient detail page, user creates consultation (POST `/api/v1/consultations/`)
2. `ConsultationViewSet` saves full medical assessment (vitals, Envagai Thervu, diagnosis)
3. User creates prescription linked to consultation (POST `/api/v1/prescriptions/`)
4. Prescription can be printed, emailed, or linked to follow-up reminder
5. Reminder system (Resend) sends follow-up emails at configured intervals

**Multi-tenant Isolation:**

1. Request arrives with clinic identifier:
   - Subdomain: `clinic-name.ayushclinic.com` (production)
   - Header: `X-Clinic-Slug: clinic-name` (development)
2. `TenantMiddleware` resolves clinic (cached 5 minutes)
3. Sets `request.clinic` for all views
4. `TenantQuerySetMixin` filters all queries: `Patient.objects.filter(clinic=request.clinic)`
5. User clinic membership enforced by `clinic` FK on User model

**State Management:**

- **Auth state:** React Context (`AuthProvider`) holds user, tokens, authentication status
- **Page state:** Individual components use `useState()` for forms, modals, filters
- **Server state:** API responses cached implicitly by `useApi()` hook (fetches on mount)
- **Auto-save:** `useAutoSave()` hook debounces mutations to prevent excessive network traffic

## Key Abstractions

**TenantQuerySetMixin:**
- Purpose: Enforces clinic isolation on all QuerySet operations
- Examples: `backend/patients/views.py`, `backend/consultations/views.py`
- Pattern: Mixin that overrides `get_queryset()` to filter by `request.clinic`
- Ensures no cross-tenant data leakage

**useApi() Hook:**
- Purpose: Encapsulates GET request logic with loading/error states
- Examples: `frontend/src/hooks/useApi.ts`, used throughout pages
- Pattern: Returns `{ data, error, isLoading, refetch }`
- Handles abort controller cleanup on unmount/url change

**useMutation() Hook:**
- Purpose: Encapsulates POST/PUT/PATCH/DELETE logic with loading/error states
- Examples: `frontend/src/hooks/useMutation.ts`, used in forms
- Pattern: Returns `{ data, error, isLoading, mutate, reset }`
- Allows flexible payload types and response handling

**AuthProvider Context:**
- Purpose: Global authentication state and operations
- Examples: `frontend/src/components/auth/AuthProvider.tsx`
- Pattern: React Context with `useAuth()` hook
- Manages login, signup, logout, user fetch on mount, token refresh

**PatientImportService:**
- Purpose: CSV import with validation and duplicate detection
- Examples: `backend/patients/import_service.py`
- Pattern: Service class with `validate_and_preview()` and `import_patients()` methods
- Supports skip_duplicates option for data integrity

**TenantMiddleware:**
- Purpose: Resolve and cache clinic from subdomain or header
- Examples: `backend/clinics/middleware.py`
- Pattern: Django middleware that sets `request.clinic` before view execution
- Exempts auth, health, schema endpoints from clinic requirement

## Entry Points

**Frontend:**

- `frontend/src/app/layout.tsx`: Root layout wrapping all pages with `AuthProvider`
  - Triggers: Application startup
  - Responsibilities: Global font setup, metadata, auth context initialization

- `frontend/src/app/(dashboard)/page.tsx`: Dashboard entry after login
  - Triggers: Authenticated user navigation to `/`
  - Responsibilities: Load dashboard stats, display quick action links

- `frontend/src/app/login/page.tsx`: Login page
  - Triggers: Unauthenticated user or 401 response
  - Responsibilities: Accept credentials, call AuthProvider.login()

- `frontend/src/app/signup/page.tsx`: Clinic registration page
  - Triggers: New clinic setup
  - Responsibilities: Validate subdomain/username/email availability, create clinic and user

**Backend:**

- `backend/config/wsgi.py`: WSGI entry point for production
  - Triggers: Web server startup (gunicorn, uWSGI)
  - Responsibilities: Initialize Django application

- `backend/config/urls.py`: Main URL router
  - Triggers: HTTP request arrives
  - Responsibilities: Route to app-specific URL configs (patients, consultations, etc.)

- `backend/clinics/middleware.py`: Tenant middleware
  - Triggers: Every request (except exempted paths)
  - Responsibilities: Resolve clinic, set request.clinic, cache result

- `backend/patients/views.py::PatientViewSet`: Patient CRUD operations
  - Triggers: GET/POST/PATCH/DELETE `/api/v1/patients/`
  - Responsibilities: List (with filtering/search), create, retrieve, update, delete patients

- `backend/consultations/views.py::ConsultationViewSet`: Consultation management
  - Triggers: GET/POST/PATCH/DELETE `/api/v1/consultations/`
  - Responsibilities: CRUD consultations linked to patients, medical assessments

- `backend/prescriptions/views.py::PrescriptionViewSet`: Prescription management
  - Triggers: GET/POST/PATCH/DELETE `/api/v1/prescriptions/`
  - Responsibilities: CRUD prescriptions linked to consultations, printing, follow-ups

## Error Handling

**Strategy:** Client-side toast/alerts + server-side validation + graceful degradation

**Patterns:**

- **API Errors:** `api.ts` interceptor catches 401 (logout) and all other errors caught by hooks
- **Validation Errors:** Backend returns field-level errors in response; frontend displays in forms
- **Network Errors:** `useApi()` and `useMutation()` catch and expose in `error` state
- **Auth Errors:** 401 responses trigger localStorage cleanup and redirect to `/login`
- **Tenant Errors:** Unresolved clinic returns 404 from middleware; all requests filtered by `request.clinic`

## Cross-Cutting Concerns

**Logging:** Not formalized - relies on browser console in frontend, Django logging in backend

**Validation:**
- Frontend: HTML5 validation + React component-level error messages
- Backend: DRF serializer validation + model-level constraints (unique_together, choices)
- Multi-tenant: Enforced by QuerySet filtering in all views

**Authentication:**
- Frontend: JWT token stored in localStorage, attached by `api.ts` interceptor
- Backend: DRF `IsAuthenticated` permission class (via middleware)
- Token refresh: Not explicitly implemented - single session token only

**Authorization:**
- Clinic membership: User `clinic` FK ensures user belongs to clinic
- Role-based: User `role` field (doctor/therapist/admin) not yet enforced in views
- Record ownership: Patient/Consultation/Prescription filtered by clinic; user cannot access other clinics

**Multi-tenancy:**
- Isolation: `TenantQuerySetMixin` + `TenantMiddleware` enforces clinic-scoped queries
- Cache key scoping: Clinic cache key includes subdomain: `clinic:subdomain:{slug}`
- Frontend awareness: `X-Clinic-Slug` header sent with requests in dev mode

---

*Architecture analysis: 2026-02-28*
