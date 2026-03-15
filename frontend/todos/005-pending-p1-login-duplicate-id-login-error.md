---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, accessibility, aria, live-regions, wcag]
dependencies: []
---

# 005 — Login page: duplicate `id="login-error"` across conditional form branches

## Problem Statement

`login/page.tsx` renders two separate `<div id="login-error" role="alert">` elements — one inside the email step form and one inside the OTP step form. While React only renders one branch at a time, this creates two structural issues: (1) when React reconciles the branch switch, the `role="alert"` element is unmounted and remounted, causing an empty alert announcement on every step transition; (2) `id` values must be globally unique per the HTML spec and WCAG 4.1.1. If any future change (animation, concurrent mode) keeps both branches alive simultaneously, duplicate ids will appear. The `aria-describedby` on the inputs references this id — which could fail silently.

## Findings

- **File:** `src/app/login/page.tsx` lines 120–126 (email step) and 162–167 (OTP step)
- Both branches render `id="login-error"`.
- The `role="alert"` is inside a conditional branch — it is remounted on step change.
- A remounted `role="alert"` with `hidden` class fires an announcement on mount in some AT.
- The `aria-live="polite"` region at line 90 and the `role="alert"` regions are redundant for the step-transition announcement — the live region fires on step change even if there is no error.
- WCAG 4.1.1 (A) — Parsing (unique ids).
- WCAG 4.1.3 (AA) — Status Messages.

## Proposed Solutions

### Option A — Hoist the error container above both form branches (Recommended)
Move a single `<div id="login-error" role="alert">` above the conditional `{step === "email" ? … : …}` block. Both forms reference the same id via `aria-describedby`. The element stays mounted across step transitions, preventing remount-triggered announcements.
```tsx
{/* Single always-rendered error live region */}
<div
  id="login-error"
  role="alert"
  className={`rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700${!error ? " hidden" : ""}`}
>
  {error?.slice(0, 200)}
</div>
{step === "email" ? <form …> … </form> : <form …> … </form>}
```
- Pros: Single id; no remount; correct AT announcement only when error is set.
- Cons: Minor JSX restructuring.
- Effort: Small
- Risk: Low

### Option B — Use `aria-live="assertive"` on a single region outside both forms
Same as Option A but with `aria-live="assertive"` instead of `role="alert"`.
- Pros: More control over announcement timing.
- Cons: `assertive` interrupts other AT speech; `role="alert"` (which implies assertive) is more semantic.
- Effort: Small
- Risk: Low

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/app/login/page.tsx`
- **WCAG criteria:** 4.1.1 (A), 4.1.3 (AA)

## Acceptance Criteria

- [ ] Only one `id="login-error"` element exists in the DOM at all times.
- [ ] Both email and OTP inputs correctly reference the single error container via `aria-describedby`.
- [ ] No spurious error announcements occur when switching between email and OTP steps.
- [ ] Error messages are announced immediately when set.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
