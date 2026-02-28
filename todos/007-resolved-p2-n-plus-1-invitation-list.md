---
status: resolved
priority: p2
issue_id: "007"
tags: [code-review, performance, backend]
dependencies: []
---

# N+1 query in invitation_list from InvitationSerializer

## Problem Statement

`invitation_list` does not use `select_related("invited_by")`, causing an N+1 query when `InvitationSerializer.get_invited_by_name()` accesses the `invited_by` FK for each invitation.

## Findings

- `backend/clinics/views.py:113` — `ClinicInvitation.objects.filter(clinic=request.clinic)` without `select_related`
- `backend/clinics/serializers.py` — `InvitationSerializer.get_invited_by_name()` accesses `obj.invited_by.get_full_name()`
- For N invitations, this generates N+1 database queries
- Identified by: performance-oracle, python-reviewer

## Proposed Solutions

### Option 1: Add select_related to queryset

**Approach:** `.select_related("invited_by")` on the invitation query.

**Effort:** 5 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/clinics/views.py:113` — invitation_list queryset

## Acceptance Criteria

- [ ] invitation_list uses select_related("invited_by")
- [ ] Query count is constant regardless of invitation count

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified N+1 query pattern in invitation list
