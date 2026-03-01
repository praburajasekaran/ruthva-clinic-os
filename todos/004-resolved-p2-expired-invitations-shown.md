---
status: resolved
priority: p2
issue_id: "004"
tags: [code-review, quality, backend]
dependencies: []
---

# invitation_list returns expired invitations and validate_email blocks re-inviting

## Problem Statement

Two related issues with invitation lifecycle:
1. `invitation_list` returns all invitations including expired ones, cluttering the UI
2. `validate_email` in `InviteMemberSerializer` blocks re-inviting an email after a previous invitation expires (doesn't filter by `expires_at`)

## Findings

- `backend/clinics/views.py:113` — `invitation_list` queries all invitations without filtering expired ones
- `backend/clinics/serializers.py:35` — `validate_email` checks `ClinicInvitation.objects.filter(clinic=clinic, email=value, accepted_at__isnull=True)` but doesn't exclude expired invitations
- An expired, unaccepted invitation permanently blocks that email from being re-invited
- Identified by: python-reviewer, architecture-strategist

## Proposed Solutions

### Option 1: Filter expired invitations in both places

**Approach:** Add `expires_at__gt=timezone.now()` filter to both the list query and the uniqueness validation.

**Effort:** 30 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/clinics/views.py:113` — invitation_list view
- `backend/clinics/serializers.py:35` — InviteMemberSerializer.validate_email

## Acceptance Criteria

- [ ] Expired invitations are not shown in the invitation list
- [ ] Can re-invite an email after previous invitation has expired
- [ ] Active (non-expired) invitations still prevent duplicate invites

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified missing expiry filtering in invitation list and validation
