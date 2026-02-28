---
status: resolved
priority: p2
issue_id: "009"
tags: [code-review, security, backend]
dependencies: []
---

# Weak password enforcement on invite acceptance

## Problem Statement

`AcceptInviteSerializer` only enforces `min_length=8` on passwords. It does not use Django's built-in password validators (common password check, numeric-only check, similarity to username check), allowing weak passwords like "12345678" or "password".

## Findings

- `backend/clinics/serializers.py` — `AcceptInviteSerializer.password` field has `min_length=8` only
- Django provides `AUTH_PASSWORD_VALIDATORS` in settings but these are not invoked by the serializer
- The signup flow may have the same issue (not reviewed in this PR)
- Identified by: security-sentinel

## Proposed Solutions

### Option 1: Call Django password validators in serializer

**Approach:** Use `django.contrib.auth.password_validation.validate_password()` in the serializer's `validate_password` method.

```python
from django.contrib.auth.password_validation import validate_password

class AcceptInviteSerializer(serializers.Serializer):
    def validate_password(self, value):
        validate_password(value)
        return value
```

**Effort:** 15 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/clinics/serializers.py` — AcceptInviteSerializer

## Acceptance Criteria

- [ ] Password "12345678" is rejected
- [ ] Password "password" is rejected
- [ ] Django's AUTH_PASSWORD_VALIDATORS are applied
- [ ] Clear error messages returned to frontend

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified missing Django password validators in invite acceptance
