---
status: resolved
priority: p2
issue_id: "025"
tags: [security, validation, phase-5]
dependencies: []
---

# Inaccurate diagnostic_data payload size measurement

## Problem Statement

The `validate_diagnostic_data` method uses `sys.getsizeof(str(value))` to check the 32KB limit. This is inaccurate because:
1. `sys.getsizeof()` measures Python object memory overhead (includes ~49 bytes of CPython string header), not actual data size
2. `str(value)` produces Python repr format (`{'key': 'value'}`) not JSON format (`{"key": "value"}`), which differ in quoting and spacing

This could allow payloads slightly larger than 32KB or reject payloads slightly smaller than intended.

## Findings

- [serializers.py:132](backend/consultations/serializers.py#L132): `if sys.getsizeof(str(value)) > MAX_DIAGNOSTIC_DATA_SIZE`
- `sys.getsizeof("")` returns 49 on CPython (object header overhead)
- For a 32KB limit, the effective threshold is ~32KB minus 49 bytes — negligible but semantically incorrect
- `str({"a": "b"})` returns `"{'a': 'b'}"` while `json.dumps({"a": "b"})` returns `'{"a": "b"}'`

## Proposed Solutions

### Option 1: Use len(json.dumps(value))

**Approach:** Replace `sys.getsizeof(str(value))` with `len(json.dumps(value))` for accurate JSON byte measurement.

**Pros:**
- Accurate measurement of actual JSON payload size
- Consistent with what gets stored in PostgreSQL JSONB

**Cons:**
- `json.dumps` is slightly slower than `str()` (negligible for 32KB data)
- Already importing `sys` — would need `import json` (but json is stdlib)

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Replace `sys.getsizeof(str(value))` with `len(json.dumps(value))` and remove the `import sys` if no longer needed.

## Technical Details

**Affected files:**
- `backend/consultations/serializers.py:1` — change `import sys` to `import json`
- `backend/consultations/serializers.py:132` — change size measurement

## Acceptance Criteria

- [ ] Size check uses `len(json.dumps(value))` instead of `sys.getsizeof(str(value))`
- [ ] `import sys` removed if unused
- [ ] Existing tests still pass

## Work Log

### 2026-03-01 - Initial Discovery

**By:** Claude Code (Phase 5 review)

**Actions:**
- Identified inaccurate size measurement using sys.getsizeof
- Verified correct alternative is json.dumps
