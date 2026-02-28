---
status: resolved
priority: p1
issue_id: "001"
tags: [code-review, security, multi-tenancy]
dependencies: []
---

# IsClinicOwner permission allows cross-tenant privilege escalation

## Problem Statement

The `IsClinicOwner` permission class checks `request.user.is_clinic_owner` but does NOT verify that the user belongs to the **current tenant's clinic** (resolved by `TenantMiddleware`). A clinic owner from Clinic A could potentially perform owner-only actions on Clinic B's data by sending requests with Clinic B's subdomain/header.

This is the highest-severity finding because it undermines the entire multi-tenant isolation model.

## Findings

- `backend/clinics/permissions.py:16-22` — `IsClinicOwner.has_permission()` only checks `request.user.is_authenticated` and `request.user.is_clinic_owner`
- Missing check: `request.user.clinic_id == request.clinic.id` (where `request.clinic` is set by `TenantMiddleware`)
- All team management endpoints (`team_invite`, `team_update_role`, `team_remove`, `invitation_cancel`) use `IsClinicOwner` and are affected
- The existing `IsClinicMember` permission correctly checks clinic membership, but `IsClinicOwner` does not inherit or compose this check
- Identified by: security-sentinel, python-reviewer, architecture-strategist (3 independent agents)

## Proposed Solutions

### Option 1: Add clinic membership check to IsClinicOwner

**Approach:** Add `request.user.clinic_id == getattr(request, 'clinic', object()).id` to the existing permission class.

```python
class IsClinicOwner(BasePermission):
    def has_permission(self, request, view):
        clinic = getattr(request, "clinic", None)
        return (
            request.user.is_authenticated
            and clinic is not None
            and request.user.is_clinic_owner
            and request.user.clinic_id == clinic.id
        )
```

**Pros:**
- Minimal change, single file edit
- Follows existing pattern from `IsClinicMember`
- Immediately closes the vulnerability

**Cons:**
- None significant

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Make IsClinicOwner inherit from IsClinicMember

**Approach:** Have `IsClinicOwner` call `super().has_permission()` from `IsClinicMember` first, then add the owner check.

**Pros:**
- DRY — membership check defined once
- Enforces that ownership always implies membership

**Cons:**
- Slightly more complex inheritance chain
- Python MRO considerations

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `backend/clinics/permissions.py:16-22` — IsClinicOwner class

**Affected endpoints (all gated by IsClinicOwner):**
- `POST /api/v1/team/invite/` — team_invite
- `PATCH /api/v1/team/<id>/role/` — team_update_role
- `DELETE /api/v1/team/<id>/remove/` — team_remove
- `DELETE /api/v1/team/invitations/<id>/cancel/` — invitation_cancel

## Resources

- **PR:** #14
- **Related pattern:** `IsClinicMember` in same file correctly checks `request.user.clinic_id == clinic.id`

## Acceptance Criteria

- [ ] `IsClinicOwner` verifies `request.user.clinic_id == request.clinic.id`
- [ ] A clinic owner from Clinic A cannot invoke owner-only actions on Clinic B
- [ ] All existing team management tests still pass
- [ ] Manual test: cross-tenant request returns 403

## Work Log

### 2026-02-28 - Initial Discovery

**By:** Claude Code (code review agents: security-sentinel, python-reviewer, architecture-strategist)

**Actions:**
- Identified missing clinic membership check in IsClinicOwner
- Confirmed all team management views use this permission
- Verified IsClinicMember has the correct pattern to reference

**Learnings:**
- Multi-tenant permission classes must always validate tenant membership, not just role
