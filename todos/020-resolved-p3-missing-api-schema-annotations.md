---
status: resolved
priority: p3
issue_id: "020"
tags: [code-review, quality, backend, documentation]
dependencies: []
---

# Missing @extend_schema annotations on all team/invite views

## Problem Statement

None of the function-based views in `clinics/views.py` have `@extend_schema` annotations from `drf-spectacular`. This means the team management API is not documented in the auto-generated OpenAPI schema.

## Findings

- `backend/clinics/views.py` — 8 views without schema annotations
- Existing ViewSets (patients, consultations, prescriptions) may auto-generate schema, but FBVs need explicit annotations
- Identified by: architecture-strategist

## Proposed Solutions

### Option 1: Add @extend_schema to all views

**Approach:** Add request/response schema annotations to each view.

**Effort:** 1-2 hours | **Risk:** Low

## Acceptance Criteria

- [ ] All 8 team/invite views have @extend_schema annotations
- [ ] OpenAPI schema includes team management endpoints

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified missing API documentation annotations
