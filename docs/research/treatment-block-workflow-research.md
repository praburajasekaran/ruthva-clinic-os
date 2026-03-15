# Treatment Block Workflow - Codebase Research

## 1. FOLLOW-UPS SYSTEM (Current State)

### There is NO standalone FollowUp model

Follow-ups are **not a dedicated model**. They are a **composite API view** at `/api/v1/dashboard/follow-ups/` (function-based view in `backend/config/views.py:83-257`) that aggregates three source types into a unified queue:

1. **Legacy prescription follow-ups**: `Prescription.follow_up_date` field (line 21 of `backend/prescriptions/models.py`)
2. **Legacy procedure follow-ups**: `ProcedureEntry.follow_up_date` field (line 76 of `backend/prescriptions/models.py`)
3. **Therapist worklist sessions**: `TreatmentSession` where `execution_status='planned'` (from `backend/treatments/models.py`)
4. **Doctor action tasks**: `DoctorActionTask` with `status='open'` (from `backend/treatments/models.py`)

### Follow-ups API endpoint

- **URL**: `GET /api/v1/dashboard/follow-ups/`
- **Query params**: `?tab=therapist|doctor|all` and `?status=open|resolved`
- **Role filtering** (config/views.py:104-111):
  - Therapist: sees only legacy + therapist items (no doctor tasks)
  - Doctor: sees only doctor tasks (no legacy, no therapist)
  - Admin: sees all queues
- **Date window**: -30 days to +90 days from today
- **Response shape** (`FollowUpsResponse` type in `frontend/src/lib/types.ts:339-351`):
```typescript
{
  items: (LegacyFollowUpItem | TherapistWorklistItem | DoctorActionItem)[],
  meta: { tab, status, counts: { legacy, therapist, doctor, total } }
}
```

### Follow-ups Frontend Page

- **File**: `frontend/src/app/(dashboard)/follow-ups/page.tsx` (500 lines)
- Uses `useApi<FollowUpsResponse>` hook for data fetching
- Three tabs: "Therapist Worklist", "Doctor Actions", "All Queues"
- Tab auto-selects based on `user.role`
- Therapist cards: inline feedback form (completion_status, response_score 1-5, notes, review_requested checkbox)
- Doctor cards: inline "Create Next Block" form (start_day, end_day, start_date, procedure, medium, instructions)
- Sidebar badge count from `/dashboard/follow-ups/?tab=all`

---

## 2. TREATMENT MODELS (Already Exist!)

The treatment block system is **already built** at the model/API level in `backend/treatments/`. Here are the exact models:

### TreatmentPlan (`backend/treatments/models.py:7-40`)
| Field | Type | Notes |
|-------|------|-------|
| clinic | FK -> Clinic | CASCADE |
| prescription | FK -> Prescription | CASCADE, related_name="treatment_plans" |
| total_days | PositiveSmallIntegerField | default=1 |
| status | CharField(20) | draft/active/completed |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |

### TreatmentBlock (`backend/treatments/models.py:43-83`)
| Field | Type | Notes |
|-------|------|-------|
| treatment_plan | FK -> TreatmentPlan | CASCADE, related_name="blocks" |
| block_number | PositiveSmallIntegerField | unique with plan |
| start_day_number | PositiveSmallIntegerField | |
| end_day_number | PositiveSmallIntegerField | |
| start_date | DateField | |
| end_date | DateField | |
| status | CharField(20) | planned/in_progress/completed |
| replan_required | BooleanField | default=False |
| completed_at | DateTimeField | nullable |

### TreatmentSession (`backend/treatments/models.py:86-138`)
| Field | Type | Notes |
|-------|------|-------|
| treatment_block | FK -> TreatmentBlock | CASCADE, related_name="sessions" |
| day_number | PositiveSmallIntegerField | unique with block |
| session_date | DateField | |
| procedure_name | CharField(255) | |
| medium_type | CharField(20) | oil/powder/other |
| medium_name | CharField(255) | blank allowed |
| instructions | TextField | blank allowed |
| execution_status | CharField(20) | planned/done/not_done |

### SessionFeedback (`backend/treatments/models.py:141-175`)
| Field | Type | Notes |
|-------|------|-------|
| treatment_session | OneToOneField -> TreatmentSession | CASCADE, related_name="feedback" |
| therapist | FK -> User | CASCADE |
| completion_status | CharField(20) | done/not_done |
| response_score | PositiveSmallIntegerField | 1-5 validators |
| notes | TextField | blank allowed |
| review_requested | BooleanField | default=False |

### DoctorActionTask (`backend/treatments/models.py:178-237`)
| Field | Type | Notes |
|-------|------|-------|
| clinic | FK -> Clinic | CASCADE |
| treatment_plan | FK -> TreatmentPlan | CASCADE, related_name="doctor_tasks" |
| treatment_block | FK -> TreatmentBlock | CASCADE, related_name="doctor_tasks" |
| assigned_doctor | FK -> User | SET_NULL, nullable |
| task_type | CharField(32) | block_completed/review_requested |
| status | CharField(20) | open/resolved (unique constraint: one open per block+type) |
| due_date | DateField | nullable |
| resolved_at | DateTimeField | nullable |

---

## 3. PRESCRIPTION MODEL

**File**: `backend/prescriptions/models.py`

### Prescription (lines 4-37)
| Field | Type | Notes |
|-------|------|-------|
| clinic | FK -> Clinic | CASCADE |
| consultation | OneToOneField -> Consultation | CASCADE, related_name="prescription" |
| diet_advice / diet_advice_ta | TextField | bilingual |
| lifestyle_advice / lifestyle_advice_ta | TextField | bilingual |
| exercise_advice / exercise_advice_ta | TextField | bilingual |
| follow_up_date | DateField | nullable - this is the legacy follow-up |
| follow_up_notes / follow_up_notes_ta | TextField | bilingual |

### Medication (lines 40-66)
| Field | Type |
|-------|------|
| prescription | FK -> Prescription | related_name="medications" |
| drug_name | CharField(255) |
| dosage | CharField(100) |
| frequency | CharField(10) | OD/BD/TDS/QID/SOS/HS |
| frequency_tamil | CharField(100) |
| duration | CharField(100) |
| instructions / instructions_ta | TextField |
| sort_order | PositiveSmallIntegerField |

### ProcedureEntry (lines 69-82)
| Field | Type |
|-------|------|
| prescription | FK -> Prescription | related_name="procedures" |
| name | CharField(255) |
| details | TextField |
| duration | CharField(100) |
| follow_up_date | DateField | nullable - this is procedure-level follow-up |

**Key relationship**: Prescription -> TreatmentPlan (via `treatment_plans` related_name)

---

## 4. CONSULTATION MODEL

**File**: `backend/consultations/models.py`

| Field | Type | Notes |
|-------|------|-------|
| clinic | FK -> Clinic | CASCADE |
| patient | FK -> Patient | CASCADE, related_name="consultations" |
| conducted_by | FK -> User | SET_NULL, nullable |
| weight, height | DecimalField | vitals |
| pulse_rate | PositiveSmallIntegerField | |
| temperature | DecimalField | |
| bp_systolic, bp_diastolic | PositiveSmallIntegerField | |
| appetite, bowel, micturition, sleep_quality | CharField | normal/abnormal |
| *_notes | TextField | for each assessment |
| mental_state | TextField | |
| diagnostic_data | JSONField | discipline-specific (envagai_thervu for siddha, prakriti for ayurveda) |
| chief_complaints | TextField | |
| history_of_present_illness | TextField | |
| diagnosis | TextField | |
| icd_code | CharField(20) | |
| consultation_date | DateField | |

**Constraint**: UniqueConstraint on (clinic, patient, consultation_date) - one consultation per patient per day.

**Relationship chain**: Consultation -> Prescription (1:1) -> TreatmentPlan (1:many) -> TreatmentBlock (1:many) -> TreatmentSession (1:many) -> SessionFeedback (1:1)

---

## 5. ROLE/PERMISSION SYSTEM

**File**: `backend/users/models.py`

### User Model (extends AbstractUser)
```python
ROLE_CHOICES = [("doctor", "Doctor"), ("therapist", "Therapist"), ("admin", "Admin")]
clinic = FK -> Clinic (nullable, related_name="members")
role = CharField(max_length=20, default="doctor")
is_clinic_owner = BooleanField(default=False)
```

### Permission Classes (`backend/clinics/permissions.py`)

1. **IsClinicMember** (line 4): `user.clinic_id == request.clinic.id`
2. **IsClinicOwner** (line 16): `user.is_clinic_owner and user.clinic_id == request.clinic.id`
3. **IsDoctorOrReadOnly** (line 29): GET/HEAD/OPTIONS for all authenticated; write only for `role=="doctor"`

### How permissions are applied
- Treatment views: `[IsAuthenticated, IsClinicMember, IsDoctorOrReadOnly]`
- Session feedback: explicit check `request.user.role != "therapist"` raises PermissionDenied
- Follow-ups view: role-based filtering (therapist/doctor/admin see different queues)
- JWT token includes `clinic_id`, `clinic_slug`, `role` in claims

### Tenant isolation
- `TenantQuerySetMixin` (clinics/mixins.py): filters by `request.clinic` on every queryset, fail-closed
- `request.clinic` is set by middleware via `X-Clinic-Slug` header (dev) or subdomain (production)

---

## 6. FRONTEND PATTERNS

### Tech Stack (`frontend/package.json`)
- **Next.js 14.2.35** (App Router)
- **React 18**
- **Axios** for HTTP
- **Lucide React** for icons
- **Tailwind CSS 3.4**
- **TypeScript 5.9**
- No TanStack Query / SWR - uses custom `useApi` hook

### App Router Structure
```
frontend/src/app/
  (dashboard)/          -- layout with Sidebar
    page.tsx            -- Dashboard
    patients/           -- CRUD
    consultations/      -- CRUD
    prescriptions/      -- CRUD + print
    follow-ups/page.tsx -- Treatment operations queue
    team/page.tsx       -- Team management
    settings/page.tsx   -- Clinic settings
  login/page.tsx
  signup/page.tsx
  invite/accept/page.tsx
```

### Data Fetching Pattern
- `useApi<T>(url)` hook (`frontend/src/hooks/useApi.ts`): wraps axios GET with AbortController, returns `{ data, error, isLoading, refetch }`
- `useMutation` hook exists but not read (for POST/PATCH)
- API base: `process.env.NEXT_PUBLIC_API_URL`
- Auth: Bearer token from localStorage, auto-refresh on 401

### Tab Pattern (Follow-ups page)
- Tabs are `<button>` elements with conditional styling (bg-emerald-100 for active)
- State managed via `useState<QueueTab>`
- Query URL rebuilt via `useMemo` when tab changes
- No external tab library - all custom inline

### Form Pattern (Follow-ups page)
- Inline forms within cards (not modal/dialog)
- Local draft state via `useState<Record<id, DraftType>>`
- Direct `api.post()` calls in submit handlers
- `Button` component has `isLoading` prop for submit state

### List Page Pattern (Patients, Consultations, Prescriptions)
- Use `useApi` with pagination params
- Custom table components (PatientTable)
- Filtering via URL query params
- No DataTable library - all custom

### Type Definitions (`frontend/src/lib/types.ts`)
- Complete TypeScript types for all API responses
- Union types for queue items: `FollowUpQueueItem = LegacyFollowUpItem | TherapistWorklistItem | DoctorActionItem`
- Type guards: `isTherapistItem()`, `isDoctorItem()`, `isLegacyItem()`

---

## 7. API PATTERNS

### URL Routing (`backend/config/urls.py`)
```python
path("api/v1/patients/", include("patients.urls"))
path("api/v1/consultations/", include("consultations.urls"))
path("api/v1/prescriptions/", include("prescriptions.urls"))
path("api/v1/treatments/", include("treatments.urls"))
path("api/v1/team/", include("clinics.urls"))
path("api/v1/dashboard/stats/", dashboard_stats)
path("api/v1/dashboard/follow-ups/", follow_ups_list)
path("api/v1/auth/", include("users.urls"))
```

### Treatment URLs (`backend/treatments/urls.py`)
```python
router.register("plans", TreatmentPlanViewSet, basename="treatment-plan")
router.register("sessions", TreatmentSessionViewSet, basename="treatment-session")
```
Yields:
- `POST /api/v1/treatments/plans/` - create plan + initial block
- `GET /api/v1/treatments/plans/{id}/` - retrieve plan detail
- `POST /api/v1/treatments/plans/{id}/blocks/` - add block to plan
- `POST /api/v1/treatments/sessions/{id}/feedback/` - submit therapist feedback

### ViewSet Pattern
- `GenericViewSet` for custom actions (treatments)
- `ModelViewSet` for full CRUD (consultations, prescriptions)
- `TenantQuerySetMixin` for automatic clinic filtering
- `get_serializer_class()` switches between List/Detail serializers
- DRF DefaultRouter for URL generation
- `drf_spectacular` for OpenAPI schema

### Serializer Nesting
- `PrescriptionDetailSerializer` nests `MedicationSerializer(many=True)` and `ProcedureEntrySerializer(many=True)` with writable nested create/update
- `TreatmentPlanDetailSerializer` nests `TreatmentBlockSerializer` -> `TreatmentSessionSerializer`
- `TreatmentPlanCreateSerializer` nests `TreatmentBlockCreateSerializer` -> `SessionPlanEntrySerializer` for atomic plan+block creation

### Session Feedback Flow (`backend/treatments/serializers.py:247-319`)
On feedback submission:
1. Creates/updates `SessionFeedback`
2. Updates session `execution_status`
3. If block was `planned`, transitions to `in_progress`
4. If `review_requested`, creates `DoctorActionTask(type=review_requested)`
5. If no pending sessions remain in block:
   - Block transitions to `completed`, sets `replan_required=True`
   - Creates `DoctorActionTask(type=block_completed)`
6. Doctor assignment: prefers `consultation.conducted_by`, falls back to first doctor in clinic

---

## 8. PATIENT MODEL

**File**: `backend/patients/models.py`

| Field | Type | Notes |
|-------|------|-------|
| clinic | FK -> Clinic | CASCADE, related_name="patients" |
| record_id | CharField(20) | auto-generated PAT-YYYY-NNNN, editable=False |
| name | CharField(255) | |
| age | PositiveSmallIntegerField | |
| gender | CharField(10) | male/female/other |
| phone | CharField(15) | |
| whatsapp_number | CharField(15) | |
| email | EmailField | |
| date_of_birth | DateField | nullable |
| (many more demographic fields) | | |

**Constraint**: UniqueConstraint on (clinic, record_id)

**Related models**: MedicalHistory, FamilyHistory (FK -> Patient)

No "active_patient" tracking field exists - the `Clinic.active_patient_limit` suggests a soft limit but there is no `is_active` field on Patient.

---

## 9. CLINIC MODEL

**File**: `backend/clinics/models.py`

| Field | Type | Notes |
|-------|------|-------|
| name | CharField(255) | |
| subdomain | SlugField(63) | unique |
| discipline | CharField(20) | siddha/ayurveda/yoga_naturopathy/unani/homeopathy |
| address | TextField | |
| phone | CharField(20) | |
| email | EmailField | |
| logo_url | URLField | |
| paper_size | CharField(5) | A4/A5 |
| primary_color | CharField(7) | hex, default #2c5f2d |
| tagline | CharField(255) | |
| active_patient_limit | PositiveIntegerField | default=200 |
| is_active | BooleanField | default=True |

Team via: `User.clinic` FK -> Clinic (related_name="members")

**ClinicInvitation** model handles team invitations with token-based acceptance and role assignment.

---

## 10. KEY OBSERVATIONS FOR TREATMENT BLOCK WORKFLOW FEATURE

### What already exists
1. All 5 treatment models are built and migrated (TreatmentPlan, TreatmentBlock, TreatmentSession, SessionFeedback, DoctorActionTask)
2. API endpoints for plan creation, block addition, and feedback submission are live
3. Follow-ups page already shows Therapist Worklist + Doctor Actions tabs
4. Feedback flow auto-completes blocks and creates doctor tasks
5. Frontend types for all queue items are defined

### What may need enhancement
1. **No list endpoint for treatment plans** - only create + retrieve exist on TreatmentPlanViewSet
2. **No block completion endpoint** - block status transitions happen only via session feedback side-effects
3. **No session editing** - sessions are created at block creation and can only receive feedback
4. **Follow-ups page inline forms** are basic - block creation only supports a single day-range entry
5. **No treatment plan visibility from patient detail page** - no link from patient -> active treatment plans
6. **No "mark plan complete" action** - plan status only changes as side effect
7. **Legacy follow-ups coexist** - prescription/procedure follow_up_date items are separate from treatment sessions
8. **No pagination** on follow-ups list endpoint
9. **No WebSocket/real-time** - all polling via refetch

### Architectural patterns to follow
- Multi-tenant: always filter by `request.clinic`, use `TenantQuerySetMixin`
- Permissions: `[IsAuthenticated, IsClinicMember, IsDoctorOrReadOnly]`
- Serializer pattern: separate List/Detail serializers, writable nested creates
- Frontend: custom `useApi` hook, inline forms, Tailwind utility classes, Lucide icons
- Types: define in `frontend/src/lib/types.ts`, use type guards for discriminated unions
