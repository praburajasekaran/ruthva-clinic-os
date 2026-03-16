---
title: Redesign Transactional Emails with Sentry-Inspired Design System
type: feat
status: completed
date: 2026-03-16
---

# Redesign Transactional Emails with Sentry-Inspired Design System

## Overview

Redesign all 4 Ruthva transactional emails with a modern, confident visual identity inspired by Sentry's email design system. Create a shared email template module to replace the current inline HTML scattered across 3 files, then restyle each email with bold typography, strong visual hierarchy, clear CTAs, and intentional use of the emerald brand palette.

## Problem Statement

Current emails are functional but visually inconsistent and unpolished:
- **No shared template system** -- each email has its own inline HTML with duplicated styles
- **Inconsistent branding** -- OTP email is bare minimal while invitation/reminder emails have green headers
- **No Ruthva brand presence** -- emails show clinic name but not the Ruthva platform brand
- **No preview text** -- poor inbox experience
- **Outdated styling** -- doesn't match the polished SaaS product Ruthva is becoming

## Current Email Inventory

| # | Email | File | Trigger |
|---|-------|------|---------|
| 1 | OTP Login Code | `backend/users/otp.py:30-41` | User requests login |
| 2 | Clinic Invitation | `backend/clinics/email.py:17-62` | Owner invites team member |
| 3 | Prescription Follow-up | `backend/reminders/email.py:10-68` | Daily scheduled job |
| 4 | Procedure Follow-up | `backend/reminders/email.py:71-120` | Daily scheduled job |

## Proposed Solution

### Phase 1: Shared Email Template Module

Create `backend/utils/email_templates.py` with reusable HTML components:

```python
# backend/utils/email_templates.py

def email_wrapper(content: str, preview_text: str = "") -> str:
    """Full HTML document with gray background, white card, responsive wrapper."""
    ...

def email_header(topic: str) -> str:
    """Ruthva logo + horizontal divider + topic label (e.g., 'Login Code')."""
    ...

def email_footer(clinic_name: str = "", doctor_name: str = "") -> str:
    """Clinic signature (if provided) + 'Sent by Ruthva' muted text."""
    ...

def email_button(text: str, url: str) -> str:
    """Solid emerald CTA button with strong contrast."""
    ...

def email_data_row(label: str, value: str) -> str:
    """Structured key-value display row for consultation details."""
    ...

def email_data_card(rows: list[tuple[str, str]], title: str = "") -> str:
    """Card containing multiple data rows with optional title."""
    ...
```

### Phase 2: Redesign Each Email

Restyle all 4 emails using the shared components. Each email follows this structure:

```
+------------------------------------------+
|          (solid #f4f4f5 background)       |
|  +------------------------------------+  |
|  |  [Ruthva Logo]                     |  |
|  |  --------------------------------  |  |
|  |  TOPIC LABEL                       |  |
|  |                                    |  |
|  |  [Email-specific content]          |  |
|  |                                    |  |
|  |  [CTA button if applicable]        |  |
|  |                                    |  |
|  |  [Clinic signature if applicable]  |  |
|  +------------------------------------+  |
|  Sent by Ruthva                          |
+------------------------------------------+
```

## Technical Approach

### Design Tokens (inline CSS values)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#f4f4f5` (zinc-100) | Page background |
| Card | `#ffffff` | Content card |
| Primary | `#047857` (emerald-700) | CTA buttons, links, emphasis |
| Text primary | `#18181b` (zinc-900) | Headings |
| Text secondary | `#3f3f46` (zinc-700) | Body text |
| Text muted | `#a1a1aa` (zinc-400) | Footer, captions |
| Border | `#e4e4e7` (zinc-200) | Card border, dividers |
| Data card bg | `#f4f4f5` (zinc-100) | Structured data background |
| Font stack | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All text |

### Email-Specific Specs

**1. OTP Login Code** (`backend/users/otp.py`)
- Topic label: "Login Code"
- Preview text: `"Your login code is {code}"`
- Large monospace 6-digit code with letter-spacing
- Expiry notice: "This code expires in 10 minutes."
- Security note: "If you didn't request this, you can safely ignore this email."
- No CTA button -- the code IS the action

**2. Clinic Invitation** (`backend/clinics/email.py`)
- Topic label: "Team Invitation"
- Preview text: `"{inviter_name} invited you to join {clinic_name}"`
- Greeting + who invited you + what role
- Prominent "Accept Invitation" CTA button
- Expiry notice: "This invitation expires in 7 days."
- Fallback copy-paste link below button

**3. Prescription Follow-up** (`backend/reminders/email.py`)
- Topic label: "Follow-up Reminder"
- Preview text: `"Your follow-up is scheduled for {date}"`
- Patient name greeting
- Data card: Diagnosis, Last Visit, Follow-up Date, Notes (if present)
- Doctor name + clinic name signature
- Soft CTA: "Please visit the clinic at your scheduled time."

**4. Procedure Follow-up** (`backend/reminders/email.py`)
- Topic label: "Procedure Follow-up"
- Preview text: `"Your procedure follow-up is scheduled for {date}"`
- Patient name greeting
- Data card: Procedure Name, Last Visit, Follow-up Date
- Doctor name + clinic name signature
- Soft CTA: "Please visit the clinic at your scheduled time."

### Ruthva Logo Strategy

The Ruthva logo in the email header needs to be hosted at a publicly accessible URL. Options:
1. **Use existing hosted asset** -- if `ruthva.com` already serves the logo
2. **S3/CloudFront** -- upload to existing AWS infrastructure
3. **Base64 inline** -- works everywhere but increases email size (~30-50KB)

Recommend option 1 or 2 since the app already uses AWS SES.

### `send_email` Enhancement

Update `backend/utils/ses.py` to support preview text injection (hidden preheader text is part of the HTML body, so this is handled in `email_wrapper`, not in SES).

No changes needed to `ses.py` -- the wrapper function handles preview text as hidden HTML.

## Acceptance Criteria

- [x] Shared email template module exists at `backend/utils/email_templates.py`
- [x] `email_wrapper` produces valid HTML email with gray background + white card
- [x] `email_header` renders Ruthva logo + divider + topic label
- [x] `email_footer` renders clinic signature (optional) + "Sent by Ruthva"
- [x] `email_button` renders solid emerald CTA button
- [x] `email_data_card` renders structured key-value pairs
- [x] OTP email redesigned with new template components
- [x] Clinic invitation email redesigned with new template components
- [x] Prescription follow-up email redesigned with new template components
- [x] Procedure follow-up email redesigned with new template components
- [x] All 4 emails include custom preview text
- [ ] All emails render correctly in major clients (Gmail, Outlook, Apple Mail)
- [x] Existing function signatures preserved (backward compatible)
- [x] All HTML is properly escaped for dynamic content (XSS prevention)

## Implementation Sequence

### Step 1: Create shared template module
**File:** `backend/utils/email_templates.py` (new)

Build all 6 component functions. Use inline CSS only (no `<style>` tags) for maximum email client compatibility. Test by rendering each component standalone.

### Step 2: Redesign OTP email
**File:** `backend/users/otp.py`

Refactor `send_otp_email` to use shared components. Keep the same function signature: `send_otp_email(email: str, code: str)`.

### Step 3: Redesign clinic invitation email
**File:** `backend/clinics/email.py`

Refactor `send_invite_email` to use shared components. Keep the same signature: `send_invite_email(*, invitation)`.

### Step 4: Redesign follow-up reminder emails
**File:** `backend/reminders/email.py`

Refactor both `send_prescription_followup_email` and `send_procedure_followup_email`. Keep existing signatures.

### Step 5: Host Ruthva logo
Ensure logo is accessible via public URL for email rendering. Determine hosting approach based on existing infrastructure.

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Email client rendering inconsistency | Use inline CSS only, tables for layout, test in Litmus/Email on Acid |
| Logo hosting | Decide on URL before implementation; base64 fallback available |
| Breaking existing email sends | Preserve all function signatures; no caller changes needed |
| `settings.CLINIC_NAME` / `settings.CLINIC_DOCTOR_NAME` used in reminders | These settings must exist; current code already requires them |

## References

- Brainstorm: `docs/brainstorms/2026-03-16-email-redesign-brainstorm.md`
- Current OTP email: `backend/users/otp.py:30-41`
- Current invitation email: `backend/clinics/email.py:17-62`
- Current reminder emails: `backend/reminders/email.py:10-120`
- SES utility: `backend/utils/ses.py`
- Email config: `backend/config/settings/base.py`
