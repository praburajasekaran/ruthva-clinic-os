---
date: 2026-03-14
topic: otp-login
---

# OTP-Only Login for Clinic Management OS

## What We're Building
Replace the current username+password login with OTP-only email authentication (matching Ruthva's flow). User enters email → receives 6-digit OTP via Resend → enters code → gets JWT tokens.

Login page also gets Ruthva logo branding.

## Why This Approach
- Matches Ruthva platform's auth UX for consistency
- Passwordless is simpler for clinic staff (no password resets, no forgotten passwords)
- Resend already in use on Ruthva side — reuse same API key

## Key Decisions
- **OTP-only (no password fallback)**: Password login removed entirely
- **Email service: Resend**: Same as Ruthva, shared API key
- **OTP expiry: 10 minutes**: Matches Ruthva
- **6-digit numeric code**: Matches Ruthva
- **JWT still used for session**: OTP replaces password as the auth method, JWT tokens still issued on successful verification
- **Ruthva logo on login page**: Replaces the Leaf icon

## Next Steps
→ Plan and implement
