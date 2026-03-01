---
status: resolved
priority: p2
issue_id: "024"
tags: [security, data-integrity, import, phase-5]
dependencies: []
---

# Import service bypasses diagnostic_data validation

## Problem Statement

The `ConsultationImportRowSerializer` accepts `diagnostic_data` as a raw JSONField with no validation, while the `ConsultationDetailSerializer.validate_diagnostic_data` enforces:
- 32KB payload size limit (SEC-5.1)
- Denied keys check (`__proto__`, `constructor`, `prototype`) (SEC-5.2)
- 4-level nesting depth limit
- Discipline-specific top-level key validation

CSV imports completely bypass all four security controls, allowing arbitrary JSON structure to be stored in `diagnostic_data`.

## Findings

- `ConsultationImportRowSerializer` at [serializers.py:59](backend/consultations/serializers.py#L59): `diagnostic_data = serializers.JSONField(required=False, default=dict)` — no custom validation
- `ConsultationDetailSerializer.validate_diagnostic_data` at [serializers.py:125](backend/consultations/serializers.py#L125): Full validation with size, structure, and discipline checks
- Import service at [import_service.py:131-147](backend/consultations/import_service.py#L131): Only checks raw string size (MAX_JSON_CELL_SIZE) but not parsed structure
- The import service's `MAX_JSON_CELL_SIZE` check is on the raw CSV cell string, not the parsed JSON — this partially mitigates the size issue but doesn't cover denied keys, nesting depth, or discipline-specific key validation

## Proposed Solutions

### Option 1: Add validate_diagnostic_data to ConsultationImportRowSerializer

**Approach:** Extract the validation logic from `ConsultationDetailSerializer.validate_diagnostic_data` into a shared helper function and call it from both serializers.

**Pros:**
- DRY — single validation implementation
- Full parity between API and import paths

**Cons:**
- Discipline-specific validation requires clinic context, which the import serializer doesn't have via `self.context["request"]`
- Need to pass clinic/discipline into the import serializer context

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Validate in import_service._validate_row after JSON parsing

**Approach:** After `json.loads(diag_raw)` succeeds in `_validate_row`, call `_validate_diagnostic_structure()` on the parsed object and check discipline-specific keys using `self.clinic.discipline`.

**Pros:**
- Keeps import-specific logic in the import service
- Has direct access to `self.clinic` for discipline validation

**Cons:**
- Duplicates some validation logic (size check already exists, structure check would be new)

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

Option 2 is simpler. In `_validate_row`, after `json.loads(diag_raw)`, add:
1. Call `_validate_diagnostic_structure(parsed_data)` from serializers.py
2. Check top-level keys match `DISCIPLINE_SCHEMA_KEYS[self.clinic.discipline]`

## Technical Details

**Affected files:**
- `backend/consultations/import_service.py:131-147` — add validation after JSON parse
- `backend/consultations/serializers.py:22-37` — ensure `_validate_diagnostic_structure` is importable

## Acceptance Criteria

- [ ] Imported diagnostic_data is validated for denied keys
- [ ] Imported diagnostic_data is validated for nesting depth
- [ ] Imported diagnostic_data is validated for discipline-specific top-level keys
- [ ] Tests cover import with invalid diagnostic_data JSON structure

## Work Log

### 2026-03-01 - Initial Discovery

**By:** Claude Code (Phase 5 review)

**Actions:**
- Identified validation gap between API and import paths
- Verified ConsultationImportRowSerializer has no diagnostic_data validation
- Confirmed import service only checks raw string size, not parsed structure
