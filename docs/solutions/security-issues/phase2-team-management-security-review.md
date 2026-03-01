---
title: "Phase 2 Team Management — Multi-Agent Security Review"
date: "2026-02-28"
status: documented
category: security-issues
tags:
  - code-review
  - multi-agent-review
  - team-management
  - role-based-permissions
  - security
  - multi-tenancy
  - performance
  - accessibility
modules:
  - backend/clinics/permissions.py
  - backend/clinics/views.py
  - backend/clinics/models.py
  - backend/clinics/serializers.py
  - backend/clinics/email.py
  - frontend/src/app/(dashboard)/team/page.tsx
  - frontend/src/app/invite/accept/page.tsx
severity: critical
root_cause: missing-tenant-binding-in-permissions
resolution_type: code-fix
related_issues:
  - PR #14
  - PR #15
search_keywords:
  - privilege escalation
  - cross-tenant
  - race condition
  - TOCTOU
  - HTML injection
  - email escaping
  - N+1 query
  - rate limiting
  - invitation flow
  - permission class
  - IsClinicOwner
  - multi-tenant security
---

# Phase 2 Team Management — Multi-Agent Security Review

## Problem Statement

PR #14 ("Phase 2 - Team Management & Role-Based Permissions") added 30 files (+3,357 lines) implementing clinic team management with invitation flow and role-based access control. The implementation needed systematic review across security, performance, architecture, and quality dimensions before the code handles real clinic data in production.

**The challenge:** How to comprehensively review a large, multi-domain PR for a multi-tenant SaaS application and ensure no critical security gaps, performance regressions, or UX problems reach production.

## Investigation Approach

A **multi-agent code review** was executed with 9 specialized agents running in parallel:

| Agent | Focus | Findings |
|-------|-------|----------|
| kieran-python-reviewer | Backend code quality, Django patterns | 16 |
| kieran-typescript-reviewer | Frontend code quality, React/TS patterns | 17 |
| security-sentinel | OWASP, auth/authz, injection, tenant isolation | 11 |
| performance-oracle | N+1 queries, sync blocking, indexing | 7 |
| architecture-strategist | REST conventions, separation of concerns | 10 |
| agent-native-reviewer | Agent workflow parity | PASS (8/8) |
| learnings-researcher | Past solutions from docs/solutions/ | 11 surfaced |
| code-simplicity-reviewer | Dead code, YAGNI, over-engineering | 3 items |
| data-migration-expert | Migration safety, data integrity | SAFE |

After deduplication: **20 unique findings** (3 P1, 12 P2, 5 P3).

## Key Findings

### P1 Critical — Security Vulnerabilities

#### 001: Cross-Tenant Privilege Escalation in IsClinicOwner

`IsClinicOwner` checks `request.user.is_clinic_owner` but does NOT verify `request.user.clinic_id == request.clinic.id`. A clinic owner from Clinic A could perform owner-only actions on Clinic B's data.

**Before:**
```python
class IsClinicOwner(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_clinic_owner  # Missing clinic check
        )
```

**After:**
```python
class IsClinicOwner(BasePermission):
    def has_permission(self, request, view):
        clinic = getattr(request, "clinic", None)
        return (
            request.user.is_authenticated
            and clinic is not None
            and request.user.is_clinic_owner
            and request.user.clinic_id == clinic.id  # Tenant binding
        )
```

**Affected endpoints:** team_invite, team_update_role, team_remove, invitation_cancel

---

#### 002: Duplicate Accounts on Invite Accept + TOCTOU Race

`accept_invite` creates a User without checking email uniqueness. Two concurrent requests can also accept the same invitation (no `select_for_update`).

**Before:**
```python
invitation = ClinicInvitation.objects.get(token=token)  # No lock
user = User.objects.create_user(email=invitation.email, ...)  # No uniqueness check
```

**After:**
```python
with transaction.atomic():
    invitation = ClinicInvitation.objects.select_for_update().get(token=token)
    if User.objects.filter(email=invitation.email.lower()).exists():
        return Response({"detail": "User with this email already exists"}, status=400)
    user = User.objects.create_user(email=invitation.email.lower(), ...)
```

---

#### 003: HTML Injection in Invite Email Template

Email template uses f-string interpolation of user-controlled data (`clinic_name`, `first_name`, `inviter_name`) without `html.escape()`.

**Before:**
```python
html_content = f"""<h1>{clinic_name}</h1>
<p>Hello <strong>{invitation.first_name}</strong>,</p>"""
```

**After:**
```python
import html
html_content = f"""<h1>{html.escape(clinic_name)}</h1>
<p>Hello <strong>{html.escape(invitation.first_name)}</strong>,</p>"""
```

### P2 Important — Reliability, Performance, UX

| # | Finding | Fix |
|---|---------|-----|
| 004 | Expired invitations shown + block re-invites | Add `expires_at__gt=timezone.now()` filter |
| 005 | Email send failure silently ignored | Check return value, include `email_sent` in response |
| 006 | No rate limiting on invite endpoints | Add `@throttle_classes([UserRateThrottle])` |
| 007 | N+1 query in invitation_list | Add `.select_related("invited_by")` |
| 008 | Synchronous email blocks HTTP response | Use `threading.Thread` or task queue |
| 009 | Weak password validation (min_length only) | Call `django.contrib.auth.password_validation.validate_password()` |
| 010 | Modal lacks keyboard accessibility | Add Escape handler, focus trap, ARIA attributes |
| 011 | Silent error swallowing in catch blocks | Show error messages to user |
| 012 | Token storage duplicated from AuthProvider | Use AuthProvider's centralized token management |
| 013 | FRONTEND_URL missing in production settings | Add to production settings, remove fallback |
| 014 | Stale role on member removal | Clear role when setting `clinic = None` |
| 015 | Missing DB indexes on token and (clinic, accepted_at) | Add `db_index=True` and composite index |

### P3 Nice-to-Have — Cleanup

| # | Finding |
|---|---------|
| 016 | Dead code: IsDoctor class, is_pending property, AcceptInviteRequest type (~20 LOC) |
| 017 | REST URL inconsistency: POST /team/invite/ should be POST /team/invitations/ |
| 018 | Accept page uses raw `<input>` instead of project `<Input>` component |
| 019 | Email case sensitivity not normalized (should `.lower()` before storage) |
| 020 | Missing @extend_schema annotations on all 8 function-based views |

## Prevention Strategies

### Multi-Tenant Security Rules

1. **Tenant Binding Rule:** Every permission class must verify `request.user.clinic_id == request.clinic.id`. Never check only role/ownership without tenant membership.

2. **Implicit Trust Nothing Rule:** Never assume `request.user.clinic` is the correct clinic. Always validate against `request.clinic` (set by TenantMiddleware).

3. **Unique Constraint Rule:** Resources with tenant-scoped uniqueness (emails, etc.) must use composite unique constraints at the database level, not just application-level checks.

4. **State Mutation Lock Rule:** Any operation creating/modifying user accounts or invitations must use `transaction.atomic()` with `select_for_update()`.

5. **Serializer Trust Boundary Rule:** All user-controlled values rendered in HTML must be escaped. Prefer Django template engine with auto-escaping over f-strings.

### Code Review Checklist for Future PRs

- [ ] All permission classes check tenant membership (not just role)
- [ ] All querysets filter by `request.clinic` (not `request.user.clinic`)
- [ ] All ForeignKey serializer access uses `select_related()` in view
- [ ] All f-string HTML templates use `html.escape()` on user data
- [ ] All user-affecting mutations wrapped in `transaction.atomic()`
- [ ] All endpoints triggering external APIs have rate limiting
- [ ] All external API calls are non-blocking (async/threaded)
- [ ] All catch blocks surface errors to the user (no silent swallowing)
- [ ] All email fields normalized to lowercase before storage/comparison
- [ ] All invitation queries filter by `expires_at__gt=timezone.now()`
- [ ] All modals have Escape key handler, focus trap, and ARIA attributes
- [ ] All form labels have `htmlFor` attributes

### Test Cases for Critical Findings

```python
# 1. Cross-tenant escalation prevention
def test_clinic_owner_cannot_manage_other_clinics_team(self):
    """Owner of Clinic A gets 403 when calling Clinic B's team endpoints"""
    self.client.force_authenticate(self.owner_a)
    request = factory.get('/')
    request.user = self.owner_a
    request.clinic = self.clinic_b  # Different clinic
    permission = IsClinicOwner()
    self.assertFalse(permission.has_permission(request, None))

# 2. Duplicate email prevention
def test_accept_invite_rejects_existing_email(self):
    """Cannot create user with email that already exists"""
    User.objects.create_user(email="existing@test.com", ...)
    response = self.client.post('/api/v1/invite/accept/', {
        'token': self.invitation.token,
        'username': 'newuser',
        'password': 'SecurePass123!'
    })
    self.assertEqual(response.status_code, 400)

# 3. HTML injection prevention
def test_clinic_name_html_escaped_in_email(self):
    """Clinic names with HTML chars are escaped in invite emails"""
    clinic.name = '<script>alert(1)</script>'
    html = build_invite_email(invitation)
    self.assertNotIn('<script>', html)
    self.assertIn('&lt;script&gt;', html)
```

## Related Documentation

- **Existing solution:** `docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md` — documents a URL routing issue found and fixed during Phase 2
- **Architecture:** `.planning/codebase/ARCHITECTURE.md` — multi-tenant isolation flow and key abstractions
- **Requirements:** `.planning/REQUIREMENTS.md` — TEAM-01 to TEAM-04, PERM-01 (Phase 2, complete)
- **Known concerns:** `.planning/codebase/CONCERNS.md` — tokens in localStorage, missing CSRF, no rate limiting on auth endpoints
- **PR #14:** Phase 2 implementation (merged)
- **PR #15:** Code review fixes (merged)

## Resolution

All 20 findings documented as structured todo files in `todos/` directory with severity classification, proposed solutions, and acceptance criteria. The 3 P1 critical security fixes are estimated at ~1.5 hours total effort and must be addressed before the application handles real clinic data.

---

*Documented: 2026-02-28 | Reviewed by: 9 specialized agents | Total findings: 20 (3 P1, 12 P2, 5 P3)*
