---
status: resolved
priority: p2
issue_id: "014"
tags: [code-review, quality, backend]
dependencies: []
---

# team_remove leaves stale role on removed member

## Problem Statement

When removing a member from a clinic, `team_remove` sets `member.clinic = None` but leaves the `role` field unchanged. The removed user retains their role designation even though they no longer belong to any clinic.

## Findings

- `backend/clinics/views.py:103` — `member.clinic = None; member.save()` but `member.role` not cleared
- If the user is later re-invited to a different clinic, they'd retain their old role
- Minor data hygiene issue but could cause confusion
- Identified by: python-reviewer

## Proposed Solutions

### Option 1: Reset role on removal

**Approach:** Set `member.role = ""` or a default role when removing from clinic.

**Effort:** 5 minutes | **Risk:** Low

## Technical Details

**Affected files:**
- `backend/clinics/views.py:103` — team_remove view

## Acceptance Criteria

- [ ] Removed member's role is cleared/reset
- [ ] Re-invited user gets the role specified in the new invitation

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified stale role on member removal
