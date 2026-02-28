---
status: resolved
priority: p2
issue_id: "015"
tags: [code-review, performance, database]
dependencies: []
---

# Missing database indexes on ClinicInvitation model

## Problem Statement

The `ClinicInvitation` model is frequently queried by `token` (invite acceptance) and by `(clinic, accepted_at)` (pending invitation list), but these columns lack database indexes beyond the existing partial unique constraint.

## Findings

- `backend/clinics/models.py` — `token` field (UUID) used in `invite_details` and `accept_invite` lookups
- Partial unique constraint exists on `(clinic, email)` WHERE `accepted_at IS NULL`, but no index on `(clinic, accepted_at)` for the invitation list query
- `token` is a UUID4 — random, not sequential — full table scan without index
- As invitation count grows, these queries will degrade
- Identified by: performance-oracle, data-migration-expert

## Proposed Solutions

### Option 1: Add indexes via migration

**Approach:** Add `db_index=True` on `token` field and a composite index on `(clinic, accepted_at)`.

**Effort:** 15 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/clinics/models.py` — ClinicInvitation model Meta
- New migration needed

## Acceptance Criteria

- [ ] `token` field has db_index=True
- [ ] Composite index on (clinic, accepted_at) exists
- [ ] Invitation lookups use index (verified via EXPLAIN)

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified missing indexes on frequently-queried columns
