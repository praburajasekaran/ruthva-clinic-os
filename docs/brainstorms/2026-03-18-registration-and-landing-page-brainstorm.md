# Registration Flow & Landing Page Redesign

**Date:** 2026-03-18
**Status:** Brainstorm Complete

## What We're Building

Redesigning the registration flow and landing page to reduce signup friction and improve user guidance. Three main changes:

1. **Landing page**: Primary CTA becomes "Register Clinic" (currently all CTAs point to `/login`)
2. **Progressive registration**: Lightweight signup (4 fields) + OTP verification, then onboarding screen collects clinic details
3. **Login page UX**: Add persistent helper text guiding unregistered users to signup (without breaking anti-enumeration pattern)

## Why This Approach

- **Progressive onboarding** reduces signup abandonment — users commit with minimal effort (name + email + discipline), then provide clinic details after they're invested
- **Landing page should prioritize registration** since that's the primary conversion goal for new visitors; login is secondary
- **Anti-enumeration must stay** for security, but UX should make it obvious where to register so users don't get stuck

## Key Decisions

### 1. Landing Page CTA
- Primary CTA: "Register Your Clinic" → links to `/signup`
- Secondary: "Sign In" link remains in navbar for returning users

### 2. Signup Form (Step 1 — Lightweight)
Fields:
- **Dr.** (fixed prefix label, non-editable) — signals the form is for doctors, discourages office managers from entering their own name
- **First Name** * (required)
- **Last Name** (optional)
- **Email** * (required)
- **Discipline** * (required, dropdown: Siddha, Ayurveda, Yoga & Naturopathy, Unani, Homeopathy)

Removed from signup:
- ~~Password~~ (OTP-based login, no password needed)
- ~~Username~~ (email is the identifier)
- ~~Subdomain~~ (can be auto-generated or set later)

Bottom of form: "Already have an account? Sign in" link

### 3. OTP Verification (Step 2 — Inline)
- After signup form submission, send OTP to the provided email
- Verify OTP on the same page (step 2 of signup flow)
- **Account created only after OTP is verified** — signup data stored temporarily, no unverified accounts in DB
- On successful verification → create user in DB → issue JWT → redirect to onboarding

### 4. Onboarding Screen (Post-Login, Mandatory)
Fields collected after first login:
- **Clinic Name** * (required)
- **Phone Number**
- **Clinic Full Address** * (required)
- **Doctor Registration Number** * (required, free text, max ~50 chars, no format validation for MVP)

- **Mandatory**: Doctor cannot access the dashboard until onboarding is complete
- Shows on every login until clinic details are filled in
- **Post-onboarding prompt**: After completing onboarding, show a one-time prompt: "Want to add your logo and social links?" with a link to clinic settings

### 5. Optional Profile/Settings Fields (Not in Onboarding)
These live in the clinic settings/profile page, not onboarding:
- Clinic logo
- Clinic website
- Social media handles
- GST number

### 6. Login Page UX (Anti-Enumeration)
- Keep existing behavior: always show "If that email exists, a code has been sent"
- Add persistent helper text below the form: "Don't have an account? Register your clinic" with link to `/signup`
- No changes to the anti-enumeration security pattern

### 6. Who Signs Up
- Assume the doctor signs up (MVP)
- Fixed "Dr." prefix reinforces this
- Office managers / staff get invited later by the doctor from the dashboard

### 7. Duplicate Email on Signup
- Show clear error: "This email is already registered. Sign in instead?" with link to `/login`
- No anti-enumeration needed on the registration page (it's not a security-sensitive surface like login)

## Backend Changes Required

- **Signup endpoint**: Remove `password`, `username`, `subdomain` from required fields; accept `first_name`, `last_name`, `email`, `discipline`
- **Signup flow**: Store signup data temporarily → send OTP → verify OTP → create user in DB → issue JWT
- **User model**: `username` can default to email or be auto-generated
- **Clinic model**: Make `subdomain` auto-generated (from clinic name, set during onboarding)
- **New onboarding endpoint**: Accept clinic name, phone, address, registration number
- **New field**: `registration_number` on Clinic or User model (free text, max 50 chars)
- **Onboarding guard**: API returns onboarding status; frontend enforces mandatory completion

## Frontend Changes Required

- **Landing page**: Change primary CTA to "Register Your Clinic" → `/signup`
- **Signup page**: Redesign with 4 fields + inline OTP verification step
- **Login page**: Add "Don't have an account? Register your clinic" helper text
- **New onboarding page**: Mandatory post-login clinic details form (blocks dashboard access)
- **Auth flow**: Detect incomplete profile → redirect to onboarding on every login

## Open Questions

None — all questions resolved during brainstorming.
