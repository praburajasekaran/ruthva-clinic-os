# Email Redesign — Sentry-Inspired

**Date:** 2026-03-16
**Status:** Brainstorm

## What We're Building

Redesign all 4 Ruthva transactional emails with a modern, confident visual identity inspired by Sentry's email design system. The goal is to make every email feel like it comes from a polished SaaS product — bold typography, strong visual hierarchy, clear CTAs, and intentional use of color.

## Current Emails (4 total)

| # | Email | Trigger | Current State |
|---|-------|---------|---------------|
| 1 | **OTP Login Code** | User requests login | Bare minimal — large monospace code, plain text |
| 2 | **Clinic Invitation** | Owner invites team member | Most polished — green header, CTA button, structured layout |
| 3 | **Prescription Follow-up Reminder** | Daily scheduled job | Green header, details box, doctor signature |
| 4 | **Procedure Follow-up Reminder** | Daily scheduled job | Green header, details box, doctor signature |

All emails are inline HTML in Python code. No shared template system exists.

## Design Direction

**Brand tone:** Modern & confident — bold typography, strong contrast, decisive layout.

### Design Elements (from Sentry analysis)

1. **Prominent Ruthva logo** at top with a divider below
2. **Email topic/purpose** stated clearly right below the logo (e.g., "Login Code", "Team Invitation", "Follow-up Reminder")
3. **Strong visual hierarchy** — large headings, clear body text, intentional font size progression
4. **Clear CTAs** — solid buttons with strong contrast for primary actions
5. **Color used intentionally** — for names, links, and emphasis (emerald brand palette)
6. **Varied typography** — weight changes, size changes to create information density where needed
7. **Solid light gray background** (#f4f4f5) with white content card — clean, modern, no pattern assets
8. **Notification settings** — skip for now, add later

### Email-Specific Design Notes

**OTP Login Code:**
- Topic label: "Login Code"
- Large, prominent 6-digit code (monospace, spaced)
- Expiry notice below the code
- No CTA button needed — the code IS the action
- Security note at bottom ("If you didn't request this...")

**Clinic Invitation:**
- Topic label: "Team Invitation"
- Who invited you + what role
- Prominent "Accept Invitation" CTA button
- Expiry notice (7 days)
- Fallback copy-paste link

**Prescription Follow-up Reminder:**
- Topic label: "Follow-up Reminder"
- Patient name greeting
- Structured data: diagnosis, last visit, follow-up date, notes
- Doctor name + clinic signature
- Soft CTA: contact/reschedule info

**Procedure Follow-up Reminder:**
- Topic label: "Procedure Follow-up"
- Patient name greeting
- Structured data: procedure name, last visit, follow-up date
- Doctor name + clinic signature
- Soft CTA: contact/reschedule info

## Why This Approach

- **All 4 emails redesigned** individually but sharing a consistent visual language
- **Sentry-inspired** because the user specifically admires their email clarity, hierarchy, and professionalism
- **Modern & confident** brand tone matches Ruthva's positioning as a polished clinic management SaaS
- **Solid background** over pattern — simpler to implement, fewer assets to host, cleaner look
- **Unsubscribe deferred** — focus on visual quality first, compliance features later

## Key Decisions

1. **Redesign all 4 emails** (not just OTP)
2. **Modern & confident** brand tone
3. **Solid gray background** with white content card
4. **Prominent logo + topic label** pattern for all emails
5. **Skip unsubscribe** for now
6. **Inline HTML stays in Python** (no separate template engine) — but create a shared base HTML structure as Python string constants
7. **Ruthva logo in header, clinic logo/name in signature** — branded top, personalized bottom
8. **Custom preview text per email** — better inbox experience

## Implementation Approach

Create a shared email base module (`utils/email_templates.py`) with:
- `email_header(topic: str) -> str` — Ruthva logo + divider + topic label
- `email_footer() -> str` — "Sent by Ruthva" + muted text
- `email_wrapper(content: str) -> str` — gray background + white card + responsive wrapper
- `email_button(text: str, url: str) -> str` — solid CTA button component
- `email_data_row(label: str, value: str) -> str` — structured key-value display

Then refactor each email to use these components.

## Resolved Questions

1. **Logo placement** — Ruthva logo at the top (header), clinic logo/name in the signature area at the bottom. This gives Ruthva brand presence while personalizing the sign-off for each clinic.
2. **Email preview text** — Yes, set custom preview text per email type (e.g., OTP: "Your login code is 123456", Invite: "Dr. X invited you to join Clinic Y"). Improves inbox experience.

## Open Questions

None — ready for planning.
