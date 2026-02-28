---
status: resolved
priority: p1
issue_id: "003"
tags: [code-review, security, xss]
dependencies: []
---

# HTML injection in invite email template via f-string interpolation

## Problem Statement

The invite email template in `email.py` uses Python f-strings to interpolate user-controlled data (`clinic_name`, `first_name`, `inviter_name`) directly into HTML without escaping. An attacker with clinic owner access could craft a clinic name containing malicious HTML/JavaScript that gets rendered in the recipient's email client.

## Findings

- `backend/clinics/email.py` — HTML template uses `f"{clinic_name}"`, `f"{invitation.first_name}"`, `f"{inviter_name}"` directly in HTML
- `clinic_name` is set during signup and could contain `<script>` tags or phishing HTML
- `first_name` comes from the invitation form (controlled by clinic owner)
- `inviter_name` comes from the inviting user's profile
- While most modern email clients strip `<script>` tags, HTML injection can still be used for phishing (fake login forms, misleading links)
- Identified by: security-sentinel, python-reviewer

## Proposed Solutions

### Option 1: Use html.escape() on all interpolated values

**Approach:** Import `html` module and wrap all user-supplied values with `html.escape()`.

```python
import html

html_content = f"""\
<div>
  <h1>{html.escape(clinic_name)}</h1>
  <p>Hello <strong>{html.escape(invitation.first_name)}</strong>,</p>
  <p>{html.escape(inviter_name)} has invited you...</p>
</div>"""
```

**Pros:**
- Minimal change
- Standard Python approach
- Prevents all HTML injection

**Cons:**
- Easy to forget on future template changes

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Use Django's template engine for email rendering

**Approach:** Move the HTML email to a Django template file and use Django's auto-escaping.

```python
from django.template.loader import render_to_string

html_content = render_to_string('clinics/emails/invite.html', {
    'clinic_name': clinic_name,
    'first_name': invitation.first_name,
    'inviter_name': inviter_name,
    'accept_url': accept_url,
})
```

**Pros:**
- Auto-escaping by default in Django templates
- Separation of concerns (template vs logic)
- Easier for non-developers to modify email design
- Standard Django pattern

**Cons:**
- More files to manage
- Slightly more setup

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `backend/clinics/email.py` — send_invite_email function

**Attack vector:**
- Clinic owner sets `clinic_name` to `<img src=x onerror="...">` or phishing HTML
- Invite email renders the malicious HTML in recipient's email client

## Resources

- **PR:** #14
- **OWASP:** HTML injection / email injection
- **Python docs:** `html.escape()`

## Acceptance Criteria

- [ ] All user-supplied values in email templates are HTML-escaped
- [ ] Setting clinic_name to `<script>alert(1)</script>` renders as literal text in email
- [ ] Email still renders correctly with normal clinic names containing special chars (& < >)

## Work Log

### 2026-02-28 - Initial Discovery

**By:** Claude Code (code review agents: security-sentinel, python-reviewer)

**Actions:**
- Identified f-string HTML interpolation without escaping
- Reviewed all user-controlled values in email template
- Assessed attack surface (phishing via HTML injection in emails)

**Learnings:**
- Always escape user data in HTML contexts, even in emails
- Django template engine provides auto-escaping and is the preferred approach
