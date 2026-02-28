# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
sivanethram/
├── frontend/                      # Next.js 15 SaaS frontend
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   │   ├── layout.tsx         # Root layout with AuthProvider
│   │   │   ├── login/             # Authentication pages
│   │   │   ├── signup/
│   │   │   ├── fonts/             # Custom font files
│   │   │   ├── (dashboard)/       # Protected routes group
│   │   │   │   ├── page.tsx       # Dashboard
│   │   │   │   ├── patients/      # Patient management
│   │   │   │   ├── consultations/ # Consultation management
│   │   │   │   └── prescriptions/ # Prescription management
│   │   │   └── globals.css        # Global Tailwind styles
│   │   ├── components/            # React components
│   │   │   ├── auth/              # Authentication components
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── CommandPalette.tsx
│   │   │   │   └── KeyboardProvider.tsx
│   │   │   ├── patients/          # Patient-related components
│   │   │   │   ├── PatientTable.tsx
│   │   │   │   ├── PatientForm.tsx
│   │   │   │   ├── PatientBanner.tsx
│   │   │   │   └── PatientShortcutsInit.tsx
│   │   │   ├── consultations/     # Consultation components
│   │   │   ├── prescriptions/     # Prescription components
│   │   │   ├── forms/             # Form utilities
│   │   │   │   ├── FormField.tsx
│   │   │   │   ├── FormSection.tsx
│   │   │   │   └── DynamicTable.tsx
│   │   │   └── ui/                # Base UI components
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Select.tsx
│   │   │       ├── BilingualLabel.tsx
│   │   │       ├── KbdBadge.tsx
│   │   │       └── DoshaChip.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useApi.ts          # GET requests
│   │   │   ├── useMutation.ts     # POST/PUT/PATCH/DELETE
│   │   │   ├── useAutoSave.ts     # Auto-save with debounce
│   │   │   ├── useDebouncedSearch.ts
│   │   │   ├── useScrollSpy.ts
│   │   │   └── usePatientShortcuts.ts
│   │   └── lib/                   # Utilities and types
│   │       ├── api.ts             # Axios instance with interceptors
│   │       ├── types.ts           # TypeScript interfaces
│   │       ├── fonts.ts           # Font configuration
│   │       └── constants/         # App constants
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── backend/                       # Django REST API
│   ├── config/                    # Django project settings
│   │   ├── settings.py            # Django configuration
│   │   ├── urls.py                # Main URL router
│   │   ├── wsgi.py                # WSGI entry point
│   │   ├── asgi.py                # ASGI entry point (unused)
│   │   └── views.py               # Global views (health, stats)
│   ├── clinics/                   # Clinic (tenant) management
│   │   ├── models.py              # Clinic model
│   │   ├── views.py               # Clinic views
│   │   ├── serializers.py         # Clinic serializers
│   │   ├── middleware.py          # TenantMiddleware
│   │   ├── mixins.py              # TenantQuerySetMixin
│   │   ├── admin.py               # Django admin config
│   │   ├── apps.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── patients/                  # Patient management
│   │   ├── models.py              # Patient, MedicalHistory, FamilyHistory
│   │   ├── views.py               # PatientViewSet
│   │   ├── serializers.py         # Serializers
│   │   ├── import_service.py      # CSV import logic
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── consultations/             # Consultation management
│   │   ├── models.py              # Consultation model
│   │   ├── views.py               # ConsultationViewSet
│   │   ├── serializers.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── prescriptions/             # Prescription management
│   │   ├── models.py              # Prescription model
│   │   ├── views.py               # PrescriptionViewSet
│   │   ├── serializers.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── users/                     # User and auth management
│   │   ├── models.py              # User (extends AbstractUser)
│   │   ├── views.py               # CustomTokenObtainPairView, signup, checks
│   │   ├── serializers.py         # Token, signup, availability serializers
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── reminders/                 # Follow-up email reminders
│   │   ├── models.py              # Reminder model
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── manage.py                  # Django CLI
│   ├── seed_data.py               # Test/demo data seeding
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables
│   └── .env.example
│
├── docs/                          # Documentation
│   └── [Deployment, API docs, etc.]
│
├── .planning/                     # GSD planning documents
│   └── codebase/                  # This analysis
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
│
├── .vscode/                       # VS Code settings
├── .git/                          # Git repository
├── .gitignore
├── TO-DOS.md                      # Project TODOs
└── README.md (implied)
```

## Directory Purposes

**frontend/src/app/:**
- Purpose: Next.js App Router pages and global layout
- Contains: Page components (`.tsx`), route groups (parenthesized folders), layout hierarchy
- Key files: `layout.tsx` (root), `(dashboard)/` (protected routes), `login/`, `signup/`

**frontend/src/components/:**
- Purpose: Reusable React components organized by feature domain
- Contains: Authentication, layout, forms, UI building blocks, domain-specific features
- Key files: `auth/AuthProvider.tsx` (global state), `ui/` (base components)

**frontend/src/hooks/:**
- Purpose: Custom React hooks for API communication and browser APIs
- Contains: Data fetching (`useApi`, `useMutation`), side effects (`useAutoSave`), utilities
- Key files: `useApi.ts` (GET), `useMutation.ts` (mutations), `useAutoSave.ts` (auto-save)

**frontend/src/lib/:**
- Purpose: Utilities, types, and configuration
- Contains: API client, TypeScript types, font setup, constants
- Key files: `api.ts` (axios instance), `types.ts` (interfaces)

**backend/config/:**
- Purpose: Django project-level configuration
- Contains: Settings, URL routing, WSGI/ASGI entry points, global views
- Key files: `settings.py` (Django config), `urls.py` (router), `views.py` (health, stats)

**backend/clinics/:**
- Purpose: Multi-tenant infrastructure and clinic management
- Contains: Clinic model, TenantMiddleware, TenantQuerySetMixin
- Key files: `middleware.py` (tenant resolution), `models.py` (Clinic), `mixins.py` (query filtering)

**backend/patients/:**
- Purpose: Patient record management
- Contains: Patient, MedicalHistory, FamilyHistory models; import service
- Key files: `models.py` (domain objects), `import_service.py` (CSV import), `views.py` (CRUD)

**backend/consultations/:**
- Purpose: Consultation and medical assessment management
- Contains: Consultation model with Siddha-specific fields (Envagai Thervu)
- Key files: `models.py` (assessment fields), `views.py` (CRUD)

**backend/prescriptions/:**
- Purpose: Prescription management and printing
- Contains: Prescription model, prescription views
- Key files: `models.py`, `views.py`

**backend/users/:**
- Purpose: Authentication, authorization, user management
- Contains: User model, JWT token views, signup/availability endpoints
- Key files: `models.py` (User), `views.py` (auth endpoints), `serializers.py`

**backend/reminders/:**
- Purpose: Follow-up email reminders via Resend
- Contains: Reminder model, email sending logic
- Key files: `models.py` (Reminder), likely `tasks.py` or `services.py` for email

## Key File Locations

**Entry Points:**

- Frontend:
  - `frontend/src/app/layout.tsx`: Root layout, AuthProvider wrapper
  - `frontend/src/app/(dashboard)/page.tsx`: Dashboard after login
  - `frontend/src/app/login/page.tsx`: Login page
  - `frontend/src/app/signup/page.tsx`: Clinic registration

- Backend:
  - `backend/config/wsgi.py`: WSGI application
  - `backend/config/urls.py`: URL routing
  - `backend/manage.py`: Django management CLI

**Configuration:**

- Frontend:
  - `frontend/tsconfig.json`: TypeScript config
  - `frontend/next.config.js`: Next.js config
  - `frontend/tailwind.config.js`: Tailwind CSS
  - `frontend/.env.local`: Environment variables (git-ignored)

- Backend:
  - `backend/config/settings.py`: Django settings
  - `backend/requirements.txt`: Python packages
  - `backend/.env`: Backend env vars (git-ignored)

**Core Logic:**

- Frontend:
  - `frontend/src/lib/api.ts`: Axios instance with auth interceptors
  - `frontend/src/components/auth/AuthProvider.tsx`: Global auth state
  - `frontend/src/hooks/useApi.ts`: GET hook for all data fetching
  - `frontend/src/hooks/useMutation.ts`: Mutation hook for all mutations

- Backend:
  - `backend/clinics/middleware.py`: Tenant resolution
  - `backend/clinics/mixins.py`: Query filtering for tenants
  - `backend/patients/views.py`: PatientViewSet (CRUD, import)
  - `backend/consultations/views.py`: ConsultationViewSet (CRUD)
  - `backend/users/views.py`: Auth endpoints

**Testing:**

- Frontend: Not yet discovered (likely `__tests__/` or `.test.tsx` files alongside components)
- Backend: `backend/*/tests.py` files per app

## Naming Conventions

**Files:**

- React components: PascalCase (e.g., `PatientForm.tsx`, `DashboardPage.tsx`)
- Hooks: camelCase prefixed with `use` (e.g., `useApi.ts`, `useMutation.ts`)
- Pages: lowercase with index pattern (e.g., `page.tsx`, `layout.tsx`)
- Utilities: camelCase (e.g., `api.ts`, `types.ts`, `constants.ts`)
- Django apps: lowercase (e.g., `patients`, `consultations`, `users`)
- Django modules: lowercase (e.g., `models.py`, `views.py`, `serializers.py`)

**Directories:**

- Features: lowercase plural (e.g., `patients`, `consultations`, `prescriptions`)
- Components: Feature-grouped lowercase (e.g., `auth`, `forms`, `ui`)
- Utilities: Semantic lowercase (e.g., `lib`, `hooks`, `config`)
- Next.js routes: lowercase with `(group)` syntax for groups

**TypeScript/JavaScript:**

- Interfaces: PascalCase (e.g., `User`, `Consultation`, `PaginatedResponse`)
- Type aliases: PascalCase (e.g., `AuthState`, `ApiError`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `DISCIPLINE_CHOICES`, `EXEMPT_SUBDOMAINS`)
- Variables/functions: camelCase (e.g., `fetchUser`, `handleSubmit`, `clinic`)

**Django Models:**

- Models: Singular PascalCase (e.g., `Patient`, `Consultation`, `Clinic`)
- Fields: lowercase snake_case (e.g., `consultation_date`, `blood_group`)
- Meta options: lowercase (e.g., `ordering`, `indexes`, `constraints`)

## Where to Add New Code

**New Feature:**

1. **Frontend pages:**
   - Create folder in `frontend/src/app/(dashboard)/[feature]/` with `page.tsx`
   - Create components in `frontend/src/components/[feature]/` if needed
   - Use `useApi()` for reads, `useMutation()` for writes
   - Example: Patient detail page at `frontend/src/app/(dashboard)/patients/[id]/page.tsx`

2. **Backend models/endpoints:**
   - Create new app: `python manage.py startapp [feature]`
   - Add `models.py` with Django ORM classes
   - Create `views.py` with ViewSet inheriting from `TenantQuerySetMixin, viewsets.ModelViewSet`
   - Add `serializers.py` with DRF serializers
   - Create `urls.py` with router registration
   - Import in `backend/config/urls.py`: `path("api/v1/[feature]/", include("[feature].urls"))`

**New Component/Module:**

- **React component:** Place in `frontend/src/components/[category]/ComponentName.tsx`
  - Use TypeScript interfaces from `lib/types.ts`
  - Import from `lucide-react` for icons
  - Use Tailwind CSS for styling
  - Example: `frontend/src/components/patients/PatientTable.tsx`

- **Django model/view:** Create in appropriate app or add to existing
  - Models inherit multi-tenant context via `TenantQuerySetMixin`
  - All QuerySets scoped to `request.clinic` automatically
  - Serializers validate and transform data
  - Views handle HTTP layer

**Utilities:**

- **Frontend helpers:** `frontend/src/lib/` for utility functions, config
  - Type definitions in `lib/types.ts`
  - API utilities in `lib/api.ts` (interceptors, endpoints)
  - Constants in `lib/constants/` or top of files

- **Backend services:** Create in app directory or `services.py`
  - Example: `backend/patients/import_service.py` for CSV import logic
  - Import and use in views
  - Keep business logic separate from HTTP handling

## Special Directories

**frontend/.next/:**
- Purpose: Next.js build output
- Generated: Yes (by `npm run build`)
- Committed: No (git-ignored)

**frontend/node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (git-ignored)

**backend/venv/:**
- Purpose: Python virtual environment
- Generated: Yes (by `python -m venv venv`)
- Committed: No (git-ignored)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (reference for future phases)

**.env files:**
- Purpose: Environment-specific configuration
- Generated: No (manually created from `.env.example`)
- Committed: No (git-ignored, contains secrets)

---

*Structure analysis: 2026-02-28*
