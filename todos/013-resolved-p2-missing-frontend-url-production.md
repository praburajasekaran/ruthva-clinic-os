---
status: resolved
priority: p2
issue_id: "013"
tags: [code-review, configuration, backend]
dependencies: []
---

# Missing FRONTEND_URL in production settings — invite emails point to localhost

## Problem Statement

`email.py` uses `getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')` to build the invite acceptance URL. If `FRONTEND_URL` is not set in production settings, all invite emails will contain `http://localhost:3000/invite/accept?token=...` links that don't work.

## Findings

- `backend/clinics/email.py` — Falls back to `http://localhost:3000` if `FRONTEND_URL` not configured
- Production settings file does not define `FRONTEND_URL`
- This would cause all invite emails in production to have broken links
- Identified by: python-reviewer, architecture-strategist

## Proposed Solutions

### Option 1: Add FRONTEND_URL to production settings

**Approach:** Add `FRONTEND_URL` to production settings file and validate it on startup.

**Effort:** 10 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/config/settings/production.py` — add FRONTEND_URL
- `backend/clinics/email.py` — consider raising error instead of silent fallback

## Acceptance Criteria

- [ ] FRONTEND_URL is configured in production settings
- [ ] Invite emails in production contain correct URL
- [ ] Application warns or fails on startup if FRONTEND_URL is missing

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified missing FRONTEND_URL in production settings
