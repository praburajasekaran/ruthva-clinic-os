---
status: resolved
priority: p3
issue_id: "017"
tags: [code-review, architecture, api-design]
dependencies: []
---

# REST URL inconsistency: POST /team/invite/ should be POST /team/invitations/

## Problem Statement

The invitation endpoints use inconsistent URL patterns. `POST /team/invite/` (singular, verb-like) doesn't match REST conventions. The list endpoint is `GET /team/invitations/` (plural, noun) but the create is `POST /team/invite/`.

## Findings

- `backend/clinics/urls.py` — `POST /team/invite/` vs `GET /team/invitations/`
- REST convention: `POST /team/invitations/` for creating, `GET /team/invitations/` for listing
- Function-based views deviate from the existing ViewSet (resource-based) pattern used elsewhere
- Identified by: architecture-strategist

## Proposed Solutions

### Option 1: Rename to POST /team/invitations/

**Approach:** Change URL pattern and update frontend API calls.

**Effort:** 30 minutes | **Risk:** Low (PR already merged, but no external consumers)

## Acceptance Criteria

- [ ] POST /team/invitations/ creates invitation
- [ ] GET /team/invitations/ lists invitations
- [ ] Frontend updated to use new URL

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified REST URL naming inconsistency
