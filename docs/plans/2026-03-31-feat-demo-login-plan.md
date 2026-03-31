---
title: "feat: Demo Login with demo@ruthva.com"
type: feat
status: completed
date: 2026-03-31
deepened: 2026-03-31
---

## Enhancement Summary

**Deepened on:** 2026-03-31
**Sections enhanced:** 7
**Research agents used:** repo-research-analyst, learnings-researcher, best-practices-researcher, Explore (discipline analysis)

### Key Improvements
1. **Multi-discipline demo**: 3 pre-seeded demo clinics (Ayurveda default, Siddha, Homeopathy) with a dropdown switcher
2. **Token reissue on switch**: Clinic switcher re-issues JWT tokens to satisfy `TenantCrossValidationAuthentication`
3. **Security hardening**: `block_demo_user` decorator on destructive endpoints, `is_demo` flag on Clinic model
4. **Institutional learnings applied**: Tenant binding rules, HTML escaping, URL path uniqueness, transaction safety from Phase 2 security review

### Institutional Learnings Applied
- **Tenant Binding Rule** (`docs/solutions/security-issues/phase2-team-management-security-review.md`): Demo clinic switch must reissue JWT with correct `clinic_id` — cross-validation in `TenantCrossValidationAuthentication` enforces `token.clinic_id == request.clinic.id`
- **HTML Injection Prevention** (same source): Demo seed data rendered in email templates or PDF exports must be escaped
- **URL Path Uniqueness** (`docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md`): New demo endpoints must use distinct paths — never duplicate an existing `path()` entry
- **Multi-Discipline Patterns** (`docs/solutions/best-practices/phase5-multi-discipline-research.md`): Discipline-specific validation via `DISCIPLINE_SCHEMA_KEYS` in `consultations/serializers.py`, diagnostic form routing via `DiagnosticFormRouter.tsx`

---

# Demo Login with demo@ruthva.com

## Overview

Allow visitors to experience Ruthva by logging in with `demo@ruthva.com`. The existing OTP flow is reused — backend skips SES email and uses a hardcoded OTP `123456`, frontend displays the code on screen so the user can enter it.

**By default, the demo lands on an Ayurveda clinic (English only).** A dropdown selector in the sidebar lets visitors switch to Siddha (English + Tamil) and Homeopathy versions — each with discipline-specific diagnostic forms, prescription formats, and realistic sample data.

## Problem Statement / Motivation

Potential users have no way to try Ruthva before signing up. A demo login removes this friction — visitors enter `demo@ruthva.com`, see the OTP `123456` displayed on screen, enter it, and land on a pre-seeded Ayurveda dashboard. They can then switch disciplines to see how Ruthva adapts to Siddha (with Tamil bilingual support) and Homeopathy (with potency/dilution fields).

## Proposed Solution

Reuse the existing OTP auth flow with targeted changes:

1. **Backend**: When `email == demo@ruthva.com`, skip SES send and use fixed OTP `123456`
2. **Frontend**: When `email == demo@ruthva.com`, show the OTP in a callout on the OTP step
3. **Multi-discipline**: 3 pre-seeded demo clinics; a sidebar dropdown switches the active clinic by reissuing JWT tokens
4. **Security**: `block_demo_user` decorator prevents invitation sending, clinic settings changes, and data export

## Technical Approach

### Backend Changes

#### 1. Add `is_demo` field to Clinic model (`backend/clinics/models.py`)

```python
# backend/clinics/models.py
class Clinic(models.Model):
    # ... existing fields ...
    is_demo = models.BooleanField(default=False)
```

Migration: `python manage.py makemigrations clinics`

### Research Insights

**Why `is_demo` instead of checking `subdomain.startswith("demo-")`:**
- Explicit and queryable — the periodic reset command targets `Clinic.objects.filter(is_demo=True)`
- Decouples naming from behavior
- Safer for the `block_demo_user` decorator

---

#### 2. Demo OTP bypass in `request_otp` (`backend/users/views.py`)

When the incoming email is `demo@ruthva.com`:
- Auto-create demo user + clinics if they don't exist (idempotent)
- Store OTP hash of `123456` in `EmailOTP` (same as normal flow)
- Skip `send_otp_email()` — no SES call
- Return `{ "detail": "...", "is_demo": true }` so frontend knows to show the code

```python
# backend/users/views.py — inside request_otp()
from users.demo import DEMO_EMAIL, ensure_demo_setup

if email == DEMO_EMAIL:
    ensure_demo_setup()  # idempotent — creates user + all 3 demo clinics
    otp_code = "123456"
    EmailOTP.objects.filter(email=email).delete()
    EmailOTP.objects.create(email=email, code_hash=hash_otp(otp_code))
    return Response({"detail": "Demo mode — use code 123456", "is_demo": True})

# ... existing OTP flow for non-demo emails
```

### Research Insights

**Throttle exemption:** Exempt `demo@ruthva.com` from `OTPRequestThrottle` (5/min). Multiple visitors from the same IP (e.g., behind corporate NAT) would hit the limit quickly. Since the OTP is hardcoded and no email is sent, there is no abuse vector.

---

#### 3. `ensure_demo_setup()` helper (`backend/users/demo.py`)

Idempotent function that creates (or verifies existence of) 3 demo clinics and 1 demo user.

```python
# backend/users/demo.py
from django.db import transaction
from users.models import User
from clinics.models import Clinic

DEMO_EMAIL = "demo@ruthva.com"

DEMO_CLINICS = [
    {
        "subdomain": "demo-ayurveda",
        "name": "Dhanvantari Demo Clinic",
        "discipline": "ayurveda",
    },
    {
        "subdomain": "demo-siddha",
        "name": "Sivanethram Demo Clinic",
        "discipline": "siddha",
    },
    {
        "subdomain": "demo-homeopathy",
        "name": "Hahnemann Demo Clinic",
        "discipline": "homeopathy",
    },
]

DEFAULT_DEMO_SUBDOMAIN = "demo-ayurveda"


def ensure_demo_setup():
    """Create demo user and all demo clinics if they don't exist. Idempotent."""
    with transaction.atomic():
        clinics = {}
        for clinic_data in DEMO_CLINICS:
            clinic, _ = Clinic.objects.get_or_create(
                subdomain=clinic_data["subdomain"],
                defaults={
                    "name": clinic_data["name"],
                    "discipline": clinic_data["discipline"],
                    "is_demo": True,
                    "is_active": True,
                },
            )
            clinics[clinic_data["subdomain"]] = clinic

        default_clinic = clinics[DEFAULT_DEMO_SUBDOMAIN]

        user, created = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={
                "username": "demo",
                "first_name": "Demo",
                "last_name": "Doctor",
                "role": "doctor",
                "is_clinic_owner": True,
                "clinic": default_clinic,
            },
        )
        if created:
            user.set_unusable_password()
            user.save()
        elif user.clinic is None:
            user.clinic = default_clinic
            user.save(update_fields=["clinic"])

        return user, clinics


def is_demo_user(user):
    """Check if the given user is the demo account."""
    return user.is_authenticated and user.email == DEMO_EMAIL
```

### Research Insights

**Why `transaction.atomic()`:** Institutional learning from Phase 2 security review — all state mutations creating/modifying user accounts must use `transaction.atomic()` to prevent partial state on failure.

**Default clinic is Ayurveda:** Per user requirement, visitors land on Ayurveda (English only) by default. Siddha adds Tamil bilingual complexity, Homeopathy adds potency fields — these are opt-in via the switcher.

---

#### 4. Demo clinic switch endpoint (`backend/users/views.py`)

New endpoint to switch the demo user between demo clinics. Reissues JWT tokens with the new `clinic_id`.

```python
# backend/users/views.py

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def switch_demo_clinic(request):
    """Switch demo user to a different demo clinic. Returns new JWT tokens."""
    from users.demo import is_demo_user

    if not is_demo_user(request.user):
        return Response({"detail": "Only available in demo mode."}, status=403)

    target_slug = request.data.get("clinic_slug", "")

    try:
        clinic = Clinic.objects.get(subdomain=target_slug, is_demo=True, is_active=True)
    except Clinic.DoesNotExist:
        return Response({"detail": "Demo clinic not found."}, status=404)

    # Update user's clinic association
    request.user.clinic = clinic
    request.user.save(update_fields=["clinic"])

    # Reissue JWT with updated clinic_id and clinic_slug
    from users.serializers import CustomTokenObtainPairSerializer

    refresh = CustomTokenObtainPairSerializer.get_token(request.user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "clinic_slug": clinic.subdomain,
    })
```

**URL registration** (`backend/users/urls.py`):
```python
path("demo/switch-clinic/", switch_demo_clinic, name="demo-switch-clinic"),
```

### Research Insights

**Why reissue JWT tokens:** The `TenantCrossValidationAuthentication` at `backend/users/authentication.py` enforces `token.clinic_id == request.clinic.id`. Changing only `localStorage.clinic_slug` without new tokens would cause every subsequent API call to fail with 403. This is a core multi-tenant security feature that must not be bypassed — instead, issue fresh tokens.

**Why update `User.clinic` FK:** The single demo user moves between clinics. This is safe because there's only one `demo@ruthva.com` account. The `AuthGuard` checks `onboarding_complete` (which requires `user.clinic != None`), so the FK must point to the active demo clinic.

**URL path uniqueness:** Per institutional learning from `docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md`, the new path `demo/switch-clinic/` must not collide with any existing path in `users/urls.py`. Using the `demo/` prefix namespace avoids this.

---

#### 5. `block_demo_user` decorator (`backend/users/demo.py`)

Prevents demo users from performing destructive or abusive operations.

```python
# backend/users/demo.py (add to existing file)
from functools import wraps
from rest_framework.response import Response


def block_demo_user(view_func):
    """Return 403 for demo users on sensitive endpoints."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if is_demo_user(request.user):
            return Response(
                {"detail": "This action is not available in demo mode."},
                status=403,
            )
        return view_func(request, *args, **kwargs)
    return wrapper
```

**Apply to these endpoints:**
- `team_invite` — prevents real SES invitation emails to arbitrary addresses
- `update_clinic` — prevents changing clinic name/subdomain/discipline
- `invitation_cancel` — prevents modifying invitation state
- `update_me` — prevents changing demo user's email (account hijack)

### Research Insights

**Why block invitations specifically:** The invitation flow triggers real SES email sends. A demo user could spam arbitrary email addresses with clinic invitations from `demo@ruthva.com`. This is the highest-risk abuse surface.

**What to allow:** Creating/editing patients, consultations, and prescriptions should remain enabled — this is the core demo experience. Data degradation is handled by periodic reset (see section 7).

---

#### 6. Reserve demo subdomains (`backend/clinics/middleware.py`)

```python
# backend/clinics/middleware.py
RESERVED_SUBDOMAINS = {"www", "api", "admin", "demo", "app"}

def is_reserved_subdomain(slug):
    """Check if subdomain is reserved (exact match or demo- prefix)."""
    return slug in RESERVED_SUBDOMAINS or slug.startswith("demo-")
```

Also update `check_availability` endpoint in `backend/clinics/views.py` to reject reserved subdomains:

```python
# backend/clinics/views.py — check_availability
if is_reserved_subdomain(subdomain):
    return Response({"available": False, "reason": "This subdomain is reserved."})
```

---

#### 7. Seed management command (`backend/users/management/commands/seed_demo.py`)

Creates demo user + 3 demo clinics + discipline-specific sample data. Idempotent — safe to run repeatedly (clears and re-seeds domain data for demo clinics).

```python
# backend/users/management/commands/seed_demo.py
from django.core.management.base import BaseCommand
from django.db import transaction
from users.demo import ensure_demo_setup, DEMO_CLINICS
from patients.models import Patient
from consultations.models import Consultation
from prescriptions.models import Prescription, Medication


class Command(BaseCommand):
    help = "Seed or reset demo clinics with discipline-specific sample data"

    def handle(self, *args, **options):
        user, clinics = ensure_demo_setup()

        for clinic_data in DEMO_CLINICS:
            clinic = clinics[clinic_data["subdomain"]]

            # Clear existing domain data (cascades to consultations, prescriptions)
            Patient.objects.filter(clinic=clinic).delete()

            # Seed discipline-appropriate data
            self._seed_clinic_data(clinic)

            self.stdout.write(
                self.style.SUCCESS(f"  Seeded {clinic.name} ({clinic.discipline})")
            )

        self.stdout.write(self.style.SUCCESS(f"Done. Demo user: {user.email}"))

    def _seed_clinic_data(self, clinic):
        seeder = {
            "ayurveda": self._seed_ayurveda,
            "siddha": self._seed_siddha,
            "homeopathy": self._seed_homeopathy,
        }.get(clinic.discipline)
        if seeder:
            seeder(clinic)

    def _seed_ayurveda(self, clinic):
        """Seed Ayurveda clinic with Prakriti-based diagnostics (English only)."""
        # 5-8 patients with Indian names
        # 5-8 consultations with prakriti dosha analysis
        #   diagnostic_data: {"prakriti": {"dosha_type": "vata_pitta", ...}}
        # 10-15 prescriptions with Ayurvedic formulations
        #   e.g., Triphala Churna, Ashwagandha, Brahmi, Dashamoola Kashayam
        pass  # Implementation fills in realistic data

    def _seed_siddha(self, clinic):
        """Seed Siddha clinic with Envagai Thervu + Tamil translations."""
        # 5-8 patients
        # 5-8 consultations with envagai_thervu diagnostic data
        #   diagnostic_data: {"envagai_thervu": {"naa": "...", "niram": "...", ...}}
        # 10-15 prescriptions with Tamil translations
        #   frequency_tamil, timing_tamil, instructions_ta fields populated
        #   e.g., Siddha Chooranam, Kashayam, Arishtam
        pass  # Follow pattern from existing backend/seed_data.py

    def _seed_homeopathy(self, clinic):
        """Seed Homeopathy clinic with case-taking + potency fields."""
        # 5-8 patients
        # 5-8 consultations with homeopathy case-taking data
        #   diagnostic_data: {"homeopathy_case": {"chief_complaints": [...], ...}}
        # 10-15 prescriptions with potency/dilution fields
        #   potency: "30C", "200C", "1M", dilution_scale: "C"/"LM"
        #   e.g., Nux Vomica 30C, Arsenicum Album 200C, Pulsatilla 1M
        pass  # Implementation fills in realistic data
```

### Research Insights

**Existing seed pattern:** Follow `backend/seed_data.py` which creates the Sivanethram Siddha clinic with 5 patients, 5 consultations, and 3 prescriptions with Tamil translations.

**Discipline-specific data that matters:**
- **Ayurveda** (`PrakritiForm.tsx`): `dosha_type`, `body_frame`, `skin_type`, `digestion`, `mental_tendency` — all English
- **Siddha** (`EnvagaiThervu.tsx`): 8 assessment fields with Tamil labels (`naa`, `niram`, `mozhi`, `vizhi`, `nadi`, `mei`, `muthiram`, `varmam`). Prescriptions need `frequency_tamil`, `timing_tamil`, `instructions_ta`
- **Homeopathy** (`HomeopathyCaseTakingForm.tsx`): `chief_complaints[]`, `mental_generals`, `physical_generals`, `miasmatic_classification`. Prescriptions need `potency`, `dilution_scale`, `pellet_count`

**Backend validation:** `DISCIPLINE_SCHEMA_KEYS` in `consultations/serializers.py` enforces that diagnostic data uses the correct top-level key per discipline (`prakriti`, `envagai_thervu`, `homeopathy_case`). Seed data must match these schemas.

**Periodic reset:** Run `python manage.py seed_demo` via cron every 6 hours to keep demo data fresh. The command deletes all `Patient` records for demo clinics (cascading to consultations/prescriptions) then re-seeds.

---

### Frontend Changes

#### 1. Demo OTP display in login page (`frontend/src/app/login/page.tsx`)

When `is_demo: true` is returned from `request-otp`:
- Change heading from "Check your email" to "Demo Mode"
- Show a callout: `Use code: 123456`
- Hide "Didn't receive the code? Check spam" text
- Keep the OTP input — user types `123456` manually to experience the real flow

```tsx
// frontend/src/app/login/page.tsx — OTP step
{isDemo ? (
  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
    <p className="text-sm text-blue-700 font-medium">Demo Mode</p>
    <p className="text-2xl font-mono font-bold text-blue-900 mt-1">123456</p>
    <p className="text-xs text-blue-600 mt-2">Enter this code below to continue</p>
  </div>
) : (
  <p>We sent a verification code to <strong>{email}</strong></p>
)}
```

#### 2. "Try Demo" button on login page

Add a secondary button below the login form:

```tsx
<button
  onClick={() => {
    setEmail("demo@ruthva.com");
    handleRequestOTP("demo@ruthva.com");
  }}
  className="text-sm text-gray-500 hover:text-gray-700 underline"
>
  Try Demo
</button>
```

This pre-fills the email and auto-submits the OTP request, jumping straight to the OTP step with the code displayed.

#### 3. Demo Clinic Switcher (`frontend/src/components/demo/DemoClinicSwitcher.tsx`)

A dropdown in the sidebar that lets demo users switch between disciplines. Only visible when `user.email === "demo@ruthva.com"`.

```tsx
// frontend/src/components/demo/DemoClinicSwitcher.tsx
import { useAuth } from "@/components/auth/AuthProvider";
import api from "@/lib/api";

const DEMO_CLINICS = [
  { slug: "demo-ayurveda", label: "Ayurveda", description: "English" },
  { slug: "demo-siddha", label: "Siddha", description: "English + Tamil" },
  { slug: "demo-homeopathy", label: "Homeopathy", description: "Potency-based" },
];

export function DemoClinicSwitcher() {
  const { user, setTokens } = useAuth();
  const [switching, setSwitching] = useState(false);

  // Only render for demo user
  if (user?.email !== "demo@ruthva.com") return null;

  const currentSlug = localStorage.getItem("clinic_slug");

  const handleSwitch = async (slug: string) => {
    if (slug === currentSlug || switching) return;
    setSwitching(true);
    try {
      const res = await api.post("/auth/demo/switch-clinic/", {
        clinic_slug: slug,
      });
      // Store new tokens and clinic_slug
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("clinic_slug", res.data.clinic_slug);
      // Full page reload to reset all cached data
      window.location.reload();
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="px-3 py-2">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        Demo Discipline
      </label>
      <select
        value={currentSlug || ""}
        onChange={(e) => handleSwitch(e.target.value)}
        disabled={switching}
        className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm"
      >
        {DEMO_CLINICS.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label} — {c.description}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Research Insights

**Placement:** In the sidebar, directly below the clinic name/logo. The sidebar already shows clinic branding, so the switcher slots in naturally.

**Why `window.location.reload()`:** Dashboard data, patient lists, prescription caches — all fetched with the old clinic context. A full page reload is the cleanest way to ensure everything re-fetches with the new clinic_slug. Trying to invalidate React Query caches selectively is error-prone and not worth the complexity.

**Why not separate demo users per clinic:** One `demo@ruthva.com` that moves between clinics is simpler. Creating `demo-siddha@ruthva.com`, `demo-ayurveda@ruthva.com` etc. would mean the switcher triggers a full logout + re-login — confusing UX and more complex seeding.

---

## Acceptance Criteria

- [x] Entering `demo@ruthva.com` on login page triggers OTP flow without sending an email
- [x] OTP step shows `123456` in a visible callout when demo email is used
- [x] Entering `123456` logs the user into the **Ayurveda** demo dashboard by default
- [x] "Try Demo" button on login page pre-fills email and auto-submits
- [x] Sidebar shows discipline dropdown for demo user (Ayurveda / Siddha / Homeopathy)
- [x] Switching to Siddha shows Envagai Thervu diagnostic forms with Tamil labels and bilingual prescriptions
- [x] Switching to Homeopathy shows case-taking forms with potency/dilution fields
- [x] Each demo clinic has realistic sample patients, consultations, and prescriptions
- [x] Demo user cannot send clinic invitations (blocked with 403)
- [x] Demo user cannot change clinic settings (blocked with 403)
- [x] Real users cannot register a clinic with `demo` or `demo-*` subdomain
- [x] Demo email is exempt from OTP rate throttle
- [x] `python manage.py seed_demo` creates/resets all 3 demo clinics idempotently
- [x] Non-demo login flow is completely unchanged
- [x] Switching clinics reissues JWT tokens (TenantCrossValidation passes)

## Dependencies & Risks

**Risks:**
- **Data degradation**: Demo visitors can modify/delete sample data. **Mitigation**: Run `seed_demo` via cron every 6 hours to reset. Fast-follow, not MVP blocker.
- **Abuse surface**: Demo user could send clinic invitations (real SES emails). **Mitigation**: `block_demo_user` decorator on invitation endpoints — ships with MVP.
- **Concurrent switcher race**: Two visitors using the demo simultaneously could race on `User.clinic` FK updates during switching. **Mitigation**: Acceptable for demo — both visitors get valid tokens, the FK just reflects whoever switched last.
- **Security**: Hardcoded OTP is a known credential. Acceptable since the demo account contains only synthetic data and has no elevated platform permissions.

**Dependencies:**
- Existing `EmailOTP` model and `hash_otp` utility (already exist)
- Existing `Clinic` model with `discipline` and `subdomain` fields (already exist)
- Existing discipline-specific forms: `DiagnosticFormRouter.tsx`, `PrakritiForm.tsx`, `EnvagaiThervu.tsx`, `HomeopathyCaseTakingForm.tsx` (already exist)
- Existing `CustomTokenObtainPairSerializer.get_token()` for JWT reissue (already exists)
- SES email sending (already exists, just needs to be skipped for demo)

## Key Files to Modify

### Backend
| File | Change |
|------|--------|
| `backend/clinics/models.py` | Add `is_demo = BooleanField(default=False)` |
| `backend/users/demo.py` | **New file**: `ensure_demo_setup()`, `is_demo_user()`, `block_demo_user()` |
| `backend/users/views.py` | Add demo detection in `request_otp`, add `switch_demo_clinic` view |
| `backend/users/urls.py` | Add `demo/switch-clinic/` path |
| `backend/users/management/commands/seed_demo.py` | **New file**: seed command with 3 discipline seeders |
| `backend/clinics/middleware.py` | Reserve `demo` and `demo-*` subdomains |
| `backend/clinics/views.py` | Reject reserved subdomains in `check_availability` |
| `backend/clinics/views.py` | Apply `@block_demo_user` to `team_invite`, `update_clinic` |
| `backend/users/views.py` | Apply `@block_demo_user` to `update_me` |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/app/login/page.tsx` | Demo OTP display + "Try Demo" button |
| `frontend/src/components/demo/DemoClinicSwitcher.tsx` | **New file**: discipline dropdown |
| `frontend/src/app/(dashboard)/layout.tsx` or sidebar | Render `<DemoClinicSwitcher />` |

### Migration
| File | Change |
|------|--------|
| `backend/clinics/migrations/XXXX_add_is_demo.py` | Auto-generated: `is_demo` field |

## References

### Internal
- Existing seed data pattern: `backend/seed_data.py`
- OTP generation/hashing: `backend/users/otp.py`
- Auth views: `backend/users/views.py`
- Login page: `frontend/src/app/login/page.tsx`
- AuthProvider: `frontend/src/components/auth/AuthProvider.tsx`
- TenantMiddleware: `backend/clinics/middleware.py`
- TenantCrossValidation: `backend/users/authentication.py`
- Diagnostic form router: `frontend/src/components/consultations/DiagnosticFormRouter.tsx`
- JWT serializer: `backend/users/serializers.py` (`CustomTokenObtainPairSerializer`)
- Discipline schema validation: `backend/consultations/serializers.py` (`DISCIPLINE_SCHEMA_KEYS`)
- Bilingual labels: `frontend/src/lib/constants/bilingual-labels.ts`

### Institutional Learnings
- Multi-tenant security rules: `docs/solutions/security-issues/phase2-team-management-security-review.md`
- URL path collision prevention: `docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md`
- Multi-discipline patterns: `docs/solutions/best-practices/phase5-multi-discipline-research.md`
