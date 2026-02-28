---
status: resolved
priority: p2
issue_id: "012"
tags: [code-review, architecture, frontend]
dependencies: []
---

# Token storage logic duplicated between AuthProvider and accept invite page

## Problem Statement

The invite acceptance page manually stores JWT tokens in localStorage (lines 65-70) instead of using the `AuthProvider`'s existing login/token management. This creates duplicated logic that can diverge — if the token storage strategy changes (e.g., httpOnly cookies), this page won't be updated.

## Findings

- `frontend/src/app/invite/accept/page.tsx:65-70` — Manual `localStorage.setItem()` calls for access_token, refresh_token, clinic_slug
- `frontend/src/components/auth/AuthProvider.tsx` — Already has centralized token management
- Same token keys used in both places, but logic is duplicated
- Identified by: typescript-reviewer, architecture-strategist

## Proposed Solutions

### Option 1: Use AuthProvider's setTokens or login method

**Approach:** After successful invite acceptance, call AuthProvider's token management instead of raw localStorage.

**Effort:** 30 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `frontend/src/app/invite/accept/page.tsx:65-70` — manual token storage

## Acceptance Criteria

- [ ] Accept invite page uses AuthProvider for token management
- [ ] No direct localStorage manipulation for auth tokens outside AuthProvider

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified duplicated token storage logic
