---
status: resolved
priority: p2
issue_id: "011"
tags: [code-review, quality, frontend]
dependencies: []
---

# Silent error swallowing in catch blocks on team page

## Problem Statement

Multiple catch blocks in the team page silently swallow errors with no UI feedback. When role updates, member removal, or invitation cancellation fail, the user sees nothing — the UI just doesn't change.

## Findings

- `frontend/src/app/(dashboard)/team/page.tsx:186-188` — handleRoleChange catch: empty `console.error`
- `frontend/src/app/(dashboard)/team/page.tsx:204-206` — handleRemove catch: empty `console.error`
- `frontend/src/app/(dashboard)/team/page.tsx:333-335` — handleCancelInvitation catch: empty `console.error`
- Missing error state display for members list API failure (shows "Loading..." forever)
- Identified by: typescript-reviewer, architecture-strategist

## Proposed Solutions

### Option 1: Add toast/alert notifications for errors

**Approach:** Show an error message (alert or toast component) when operations fail.

**Effort:** 1 hour | **Risk:** Low

## Technical Details

**Affected files:**
- `frontend/src/app/(dashboard)/team/page.tsx` — multiple catch blocks

## Acceptance Criteria

- [ ] Failed role update shows error message to user
- [ ] Failed member removal shows error message to user
- [ ] Failed invitation cancellation shows error message to user
- [ ] API error on members list shows error state (not infinite loading)

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified silent error handling in 3+ catch blocks
