---
status: resolved
priority: p3
issue_id: "019"
tags: [code-review, quality, backend]
dependencies: []
---

# Email case sensitivity not normalized

## Problem Statement

Email addresses are not lowercased before storage or comparison. Inviting `User@Example.com` and `user@example.com` are treated as different emails, which could lead to duplicate invitations or bypassing the uniqueness constraint.

## Findings

- `backend/clinics/serializers.py` — `validate_email` compares email as-is
- `backend/clinics/models.py` — Email stored without normalization
- Partial unique constraint on `(clinic, email)` is case-sensitive
- Identified by: data-migration-expert

## Proposed Solutions

### Option 1: Normalize email to lowercase

**Approach:** Add `.lower()` on email in serializer validation and model save.

**Effort:** 15 minutes | **Risk:** Low

## Acceptance Criteria

- [ ] All emails normalized to lowercase before storage
- [ ] Case-insensitive email matching in invitation validation

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified email case sensitivity issue
