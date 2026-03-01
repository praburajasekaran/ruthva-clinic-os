---
status: resolved
priority: p2
issue_id: "008"
tags: [code-review, performance, backend]
dependencies: []
---

# Synchronous email sending blocks HTTP request in team_invite

## Problem Statement

`send_invite_email()` makes a synchronous HTTP call to the Resend API during the request-response cycle. This blocks the user's request for 500ms-2s while the email is being sent, degrading the user experience.

## Findings

- `backend/clinics/email.py` — `resend.Emails.send()` is a synchronous API call
- `backend/clinics/views.py:53` — Called inline during `team_invite` request
- Resend API latency: typically 200-800ms, can spike to 2-3s
- With multiple invites, the delay compounds
- Identified by: performance-oracle, architecture-strategist

## Proposed Solutions

### Option 1: Use Django-Q or Celery for async email

**Approach:** Queue the email send as a background task.

**Effort:** 2-4 hours (if task queue not already set up) | **Risk:** Medium

### Option 2: Use Python threading for fire-and-forget

**Approach:** Spawn a thread to send the email, return response immediately.

**Effort:** 30 minutes | **Risk:** Low (acceptable for single-instance deployment)

## Technical Details

**Affected files:**
- `backend/clinics/email.py` — send_invite_email
- `backend/clinics/views.py:53` — team_invite

## Acceptance Criteria

- [ ] Invite response returns immediately without waiting for email delivery
- [ ] Email still gets sent reliably in the background
- [ ] Email failures are logged

## Work Log

### 2026-02-28 - Initial Discovery
**By:** Claude Code
**Actions:** Identified synchronous email blocking request-response cycle
