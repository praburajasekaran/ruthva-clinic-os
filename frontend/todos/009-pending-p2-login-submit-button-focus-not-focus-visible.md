---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, accessibility, focus, wcag]
dependencies: []
---

# 009 — Login page: submit buttons use `focus:ring` instead of `focus-visible:ring`

## Problem Statement

The two submit buttons on `login/page.tsx` (Send login code and Verify) use `focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`. The PR's stated goal is to upgrade all focus rings to `focus-visible:` selectors to suppress visible rings on mouse click (WCAG 2.4.7 only requires focus indication for keyboard users). Using `focus:` causes a visible focus ring to appear when clicking the button with a mouse, which is visually distracting and inconsistent with every other interactive element in the codebase that was upgraded in this PR.

## Findings

- **File:** `src/app/login/page.tsx` lines 153 and 197
- Both submit buttons: `focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`
- All other upgraded elements in this PR use `focus-visible:ring-2 focus-visible:ring-offset-2`.
- WCAG 2.4.7 (AA) — Focus Visible: requires visible focus for keyboard navigation. `focus-visible:` satisfies this while not showing rings on mouse click.

## Proposed Solutions

### Option A — Replace `focus:` with `focus-visible:` on login buttons (Recommended)
```tsx
className="… focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 …"
```
- Pros: Consistent with rest of codebase; correct WCAG 2.4.7 compliance.
- Cons: None.
- Effort: Trivial
- Risk: None

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/app/login/page.tsx`
- **WCAG criteria:** 2.4.7 (AA)

## Acceptance Criteria

- [ ] Submit buttons show focus ring only when focused via keyboard, not on mouse click.
- [ ] `focus-visible:ring-2` is used instead of `focus:ring-2` on both submit buttons.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
