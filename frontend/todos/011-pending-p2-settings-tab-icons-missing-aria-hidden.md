---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, accessibility, aria, icons, wcag]
dependencies: []
---

# 011 — Settings page: tab button icons missing `aria-hidden="true"`

## Problem Statement

In `settings/page.tsx`, each rendered tab button contains `<tab.icon className="h-4 w-4" />` with no `aria-hidden="true"`. Lucide icons render as SVGs. When a screen reader encounters an unlabelled SVG inside a button that already has a text label, it may attempt to read the SVG's title or accessible name (often empty, resulting in a blank announcement), or announce "image" before the button text. The tab button text alone provides the complete accessible name; the icon is decorative.

## Findings

- **File:** `src/app/(dashboard)/settings/page.tsx` lines 824–825
- The commit message states "aria-hidden='true' on all decorative icons" but tab icons were missed.
- All nav icons in `Sidebar.tsx` correctly have `aria-hidden="true"` (line 140).
- WCAG 1.1.1 (A) — Non-text Content: decorative images must be hidden from AT.

## Proposed Solutions

### Option A — Add `aria-hidden` to `tab.icon` in the map (Recommended)
```tsx
<tab.icon className="h-4 w-4" aria-hidden="true" />
```
- Pros: One-line fix; consistent with Sidebar pattern.
- Cons: None.
- Effort: Trivial
- Risk: None

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/app/(dashboard)/settings/page.tsx`
- **WCAG criteria:** 1.1.1 (A)

## Acceptance Criteria

- [ ] All four tab button icons have `aria-hidden="true"`.
- [ ] Screen readers announce only the tab label text (e.g. "Profile, tab") without a preceding image announcement.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
