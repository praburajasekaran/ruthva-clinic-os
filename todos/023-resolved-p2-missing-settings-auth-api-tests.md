---
status: resolved
priority: p2
issue_id: "023"
tags: [code-review, quality, backend, testing]
dependencies: []
---

# Missing Automated Tests for New Settings/Auth Update APIs

New `/auth/me/update/` and `/auth/clinic/update/` behavior was added without dedicated users app API tests, leaving critical authorization/validation paths under-tested.

## Problem Statement

This change introduces new mutable auth endpoints (profile and clinic updates) plus new serializer rules, but `backend/users/tests.py` is still empty. Regressions in owner-only checks, email uniqueness, password flow, and response contracts can ship undetected.

## Findings

- New update endpoints added: [backend/users/urls.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/urls.py:12)
- New endpoint logic and permission branch added: [backend/users/views.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/views.py:76)
- New serializer validations added (email uniqueness/password checks): [backend/users/serializers.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/serializers.py:92)
- Users test module remains placeholder only: [backend/users/tests.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/tests.py:1)

## Proposed Solutions

### Option 1: Add focused API tests for new endpoints

**Approach:** Implement DRF tests for success and failure paths:
- `update_me`: profile-only update, password change with/without correct current password, duplicate email rejection.
- `update_clinic`: owner success, non-owner forbidden, unauthenticated denied.

**Pros:**
- Directly covers this feature.
- Fastest confidence improvement.

**Cons:**
- Limited cross-module integration coverage.

**Effort:** 3-6 hours

**Risk:** Low

---

### Option 2: Add integration tests + focused unit tests

**Approach:** Keep API tests plus serializer-level tests for validation edge cases and response shape assertions.

**Pros:**
- Stronger regression detection.
- Easier debugging of validation failures.

**Cons:**
- More test maintenance.

**Effort:** 1 day

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- [backend/users/tests.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/tests.py)
- [backend/users/views.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/views.py)
- [backend/users/serializers.py](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/serializers.py)

**Related components:**
- Settings page profile tab and clinic tab save actions
- Auth context refresh behavior after clinic update

**Database changes (if any):**
- None

## Resources

- Branch under review: `feat/phase3-branding-settings`
- Frontend caller paths:
  - [settings/page.tsx](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/frontend/src/app/(dashboard)/settings/page.tsx:62)
  - [settings/page.tsx](/Users/praburajasekaran/Documents/local-htdocs/sivanethram/frontend/src/app/(dashboard)/settings/page.tsx:215)

## Acceptance Criteria

- [ ] API tests added for `PATCH /api/v1/auth/me/update/`
- [ ] API tests added for `PATCH /api/v1/auth/clinic/update/`
- [ ] Owner/non-owner and authenticated/unauthenticated branches covered
- [ ] Validation errors and success response schema asserted

## Work Log

### 2026-02-28 - Review Discovery

**By:** Codex

**Actions:**
- Reviewed new users auth update endpoints and serializer changes.
- Checked users test suite and confirmed lack of coverage for introduced behavior.
- Assessed risk as important due auth/permission sensitivity.

**Learnings:**
- Feature implementation is complete, but regression safety net for auth mutations is missing.

## Notes

- This does not block local development but materially increases production regression risk.
