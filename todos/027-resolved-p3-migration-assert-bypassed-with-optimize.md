---
status: resolved
priority: p3
issue_id: "027"
tags: [data-integrity, migration, phase-5]
dependencies: []
---

# Migration integrity assertion uses assert (bypassable with -O flag)

## Problem Statement

The data migration `0005_migrate_envagai_to_json.py` uses a Python `assert` statement to verify migration integrity. Running Python with `-O` (optimize) flag silently disables all `assert` statements, meaning the integrity check would be skipped without any warning.

## Findings

- [0005_migrate_envagai_to_json.py:64](backend/consultations/migrations/0005_migrate_envagai_to_json.py#L64): `assert original_count == migrated_count, (...)`
- Python's `-O` flag strips all `assert` statements at bytecode compilation
- While unlikely in practice (Django migrations rarely run with `-O`), this is a correctness issue

## Proposed Solutions

### Option 1: Replace with explicit if/raise

**Approach:** Replace `assert` with `if not ...: raise RuntimeError(...)`.

**Effort:** 2 minutes

**Risk:** Low

## Technical Details

**Affected files:**
- `backend/consultations/migrations/0005_migrate_envagai_to_json.py:64-67`

## Acceptance Criteria

- [ ] Integrity check uses explicit raise instead of assert

## Work Log

### 2026-03-01 - Initial Discovery

**By:** Claude Code (Phase 5 review)
