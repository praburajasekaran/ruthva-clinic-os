---
status: resolved
priority: p1
issue_id: "002"
tags: [code-review, security, data-integrity]
dependencies: []
---

# accept_invite allows creating duplicate users with same email

## Problem Statement

The `accept_invite` view creates a new `User` without checking if a user with that email already exists. This can lead to duplicate accounts, data integrity issues, and potential account takeover if an existing user's email is used in an invitation.

## Findings

- `backend/clinics/views.py:170-213` — `accept_invite` creates user via `User.objects.create_user()` without email uniqueness check
- `backend/clinics/serializers.py` — `AcceptInviteSerializer` validates username uniqueness but NOT email uniqueness
- No `unique=True` constraint on `User.email` field at the database level (Django default)
- Additionally, there's a TOCTOU race condition: the invitation is fetched without `select_for_update()`, so two concurrent requests could both accept the same invitation
- Identified by: security-sentinel, python-reviewer, data-migration-expert

## Proposed Solutions

### Option 1: Add email uniqueness validation in AcceptInviteSerializer

**Approach:** Add `validate()` method that checks `User.objects.filter(email=invitation.email).exists()` and use `select_for_update()` on the invitation query.

```python
# In AcceptInviteSerializer
def validate(self, data):
    if User.objects.filter(email=self.context['invitation'].email).exists():
        raise serializers.ValidationError("A user with this email already exists.")
    return data

# In accept_invite view
invitation = ClinicInvitation.objects.select_for_update().get(token=token, ...)
```

**Pros:**
- Catches duplicates before creation
- select_for_update prevents race condition
- Clear error message to user

**Cons:**
- Doesn't handle the case where existing user should join the clinic instead

**Effort:** 1 hour

**Risk:** Low

---

### Option 2: Allow existing users to accept invites (join clinic)

**Approach:** If a user with the invitation email exists, add them to the clinic instead of creating a new account. Prompt for login instead of signup.

**Pros:**
- Better UX for users who already have accounts
- Prepares for future multi-clinic membership (TEAM-05)

**Cons:**
- More complex flow
- Requires authentication for existing user acceptance
- Larger scope change

**Effort:** 4-6 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `backend/clinics/views.py:170-213` — accept_invite view
- `backend/clinics/serializers.py` — AcceptInviteSerializer

**Database considerations:**
- Consider adding `unique=True` on `User.email` or a unique constraint migration
- `select_for_update()` needed on invitation query to prevent TOCTOU race

## Resources

- **PR:** #14
- **Django docs:** User model email field uniqueness

## Acceptance Criteria

- [ ] Cannot create a user with an email that already exists
- [ ] Cannot accept the same invitation twice (race condition fixed)
- [ ] Clear error message when email already in use
- [ ] Invitation marked as accepted atomically with user creation

## Work Log

### 2026-02-28 - Initial Discovery

**By:** Claude Code (code review agents: security-sentinel, python-reviewer, data-migration-expert)

**Actions:**
- Identified missing email uniqueness check in accept_invite
- Identified TOCTOU race condition on invitation acceptance
- Reviewed AcceptInviteSerializer validation logic

**Learnings:**
- Django User.email is not unique by default — must be enforced explicitly
- Invitation acceptance should be wrapped in transaction with select_for_update
