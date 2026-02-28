---
status: resolved
priority: p3
issue_id: "016"
tags: [code-review, quality, cleanup]
dependencies: []
---

# Dead code: IsDoctor, is_pending, AcceptInviteRequest type

## Problem Statement

Three pieces of code added in Phase 2 are never used anywhere in the codebase:
1. `IsDoctor` permission class — defined but never imported or referenced
2. `ClinicInvitation.is_pending` property — defined but never called
3. `AcceptInviteRequest` TypeScript type — defined but never imported

## Findings

- `backend/clinics/permissions.py` — `IsDoctor` class (only `IsDoctorOrReadOnly` is used)
- `backend/clinics/models.py` — `is_pending` property on ClinicInvitation
- `frontend/src/lib/types.ts:272-276` — `AcceptInviteRequest` type
- Total: ~20 lines of dead code
- Identified by: code-simplicity-reviewer

## Proposed Solutions

### Option 1: Remove all three

**Approach:** Delete the unused code.

**Effort:** 10 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/clinics/permissions.py` — remove IsDoctor class
- `backend/clinics/models.py` — remove is_pending property
- `frontend/src/lib/types.ts` — remove AcceptInviteRequest type

## Acceptance Criteria

- [ ] All three dead code items removed
- [ ] No import errors after removal
- [ ] Tests still pass

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified 3 dead code items via code-simplicity-reviewer
