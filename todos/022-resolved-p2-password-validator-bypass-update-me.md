---
status: resolved
priority: p2
issue_id: "022"
tags: [code-review, security, backend, auth]
dependencies: []
---

# Password Change Endpoint Skips Django Password Validators

The new profile update flow enforces only `min_length=8` for `new_password`, bypassing configured Django password validators.

## Problem Statement

The application has global password policy validators in settings, but `update_me` currently accepts new passwords without calling `validate_password()`. This allows weak passwords through profile updates even if signup/auth flows enforce stronger policy.

## Findings

- `new_password` is defined with only `min_length=8`: [backend/users/serializers.py](/Users/praburajasekaran/Documents/local-htdocs/ruthva-clinic-os/backend/users/serializers.py:94)
- Serializer validation does not call Django password validators before `set_password()`: [backend/users/serializers.py](/Users/praburajasekaran/Documents/local-htdocs/ruthva-clinic-os/backend/users/serializers.py:106)
- `update_me` endpoint uses this serializer directly: [backend/users/views.py](/Users/praburajasekaran/Documents/local-htdocs/ruthva-clinic-os/backend/users/views.py:76)
- Known pattern exists in project docs highlighting this exact risk: [phase2-team-management-security-review.md](/Users/praburajasekaran/Documents/local-htdocs/ruthva-clinic-os/docs/solutions/security-issues/phase2-team-management-security-review.md:152)

## Proposed Solutions

### Option 1: Validate new password in serializer `validate()`

**Approach:** Call `django.contrib.auth.password_validation.validate_password(new_password, self.instance)` and map errors to DRF validation errors.

**Pros:**
- Minimal change.
- Reuses configured policy.

**Cons:**
- Requires clean error formatting for frontend.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Centralize password-change service

**Approach:** Move password update + validation to a dedicated service/helper used by all password-changing flows.

**Pros:**
- Prevents policy drift across endpoints.
- Better long-term maintainability.

**Cons:**
- Slightly larger refactor.

**Effort:** 3-5 hours

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- [backend/users/serializers.py](/Users/praburajasekaran/Documents/local-htdocs/ruthva-clinic-os/backend/users/serializers.py)
- [backend/users/views.py](/Users/praburajasekaran/Documents/local-htdocs/ruthva-clinic-os/backend/users/views.py)

**Related components:**
- Profile settings page password update flow
- Auth policy consistency across signup/reset/update

**Database changes (if any):**
- None

## Resources

- Related prior learning: [phase2-team-management-security-review.md](/Users/praburajasekaran/Documents/local-htdocs/ruthva-clinic-os/docs/solutions/security-issues/phase2-team-management-security-review.md)
- Branch under review: `feat/phase3-branding-settings`

## Acceptance Criteria

- [ ] Password update endpoint applies Django password validators
- [ ] Weak/common/numeric-only passwords are rejected with clear errors
- [ ] Unit/API tests cover accepted and rejected password cases
- [ ] Frontend displays validation errors correctly

## Work Log

### 2026-02-28 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed `UserUpdateSerializer` and `update_me` flow.
- Confirmed password policy enforcement is weaker than configured global validators.
- Linked to existing documented known pattern.

**Learnings:**
- Security hardening previously documented can regress when new auth surfaces are added.

## Notes

- Important security consistency issue; should be fixed before wider rollout.
