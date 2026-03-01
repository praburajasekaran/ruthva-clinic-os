---
status: resolved
priority: p2
issue_id: "005"
tags: [code-review, reliability, backend]
dependencies: []
---

# Email send failure silently ignored in team_invite

## Problem Statement

`team_invite` view calls `send_invite_email()` but ignores its return value. If the email fails to send (Resend API error, network issue), the invitation is created in the database but the invitee never receives the email — with no indication to the clinic owner.

## Findings

- `backend/clinics/views.py:53` — `send_invite_email(invitation)` return value not captured
- `backend/clinics/email.py` — `send_invite_email` returns `True`/`False` but caller ignores it
- Additionally, `send_invite_email` catches all exceptions silently with a bare `except`
- Identified by: python-reviewer, architecture-strategist

## Proposed Solutions

### Option 1: Check return value and include warning in response

**Approach:** Capture the return value and add an `email_sent` field to the response so the frontend can show a warning.

**Effort:** 30 minutes | **Risk:** Low

### Option 2: Raise exception on email failure, rollback invitation

**Approach:** If email fails, don't create the invitation (or delete it). Use `transaction.atomic()`.

**Effort:** 1 hour | **Risk:** Medium (user must retry entire invite)

## Technical Details

**Affected files:**
- `backend/clinics/views.py:53` — team_invite view
- `backend/clinics/email.py` — send_invite_email exception handling

## Acceptance Criteria

- [ ] Clinic owner is informed if invitation email fails to send
- [ ] Email send errors are logged (not silently swallowed)

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified silent email failure in team_invite flow
