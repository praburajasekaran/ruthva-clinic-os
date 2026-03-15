---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, accessibility, aria, icons]
dependencies: []
---

# 014 — StartJourneyModal: decorative icons missing `aria-hidden="true"`

## Problem Statement

`StartJourneyModal.tsx` renders `<User>`, `<Phone>`, `<CheckCircle>`, and `<AlertTriangle>` icons from Lucide without `aria-hidden="true"`. The `User` and `Phone` icons in the patient summary row are purely decorative (the adjacent text conveys the information). `CheckCircle` in the success state and `AlertTriangle` in the error state are also decorative (the surrounding text provides the full message). These unlabelled SVGs will be announced as empty images by screen readers.

## Findings

- **File:** `src/components/integrations/StartJourneyModal.tsx` lines 75, 91, 94, 157
- Consistent with the PR's stated goal of `aria-hidden="true"` on all decorative icons.
- This file appears to have been added in a prior commit and was not updated in the a11y commit.

## Proposed Solutions

### Option A — Add `aria-hidden="true"` to all decorative icons
```tsx
<CheckCircle className="h-12 w-12 text-emerald-500" aria-hidden="true" />
<User className="h-4 w-4 text-gray-400" aria-hidden="true" />
<Phone className="h-4 w-4 text-gray-400" aria-hidden="true" />
<AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
```
- Pros: Consistent with rest of codebase; eliminates empty image announcements.
- Cons: None.
- Effort: Trivial
- Risk: None

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/components/integrations/StartJourneyModal.tsx`
- **WCAG criteria:** 1.1.1 (A)

## Acceptance Criteria

- [ ] All four icons have `aria-hidden="true"`.
- [ ] Screen readers do not announce unlabelled images in this modal.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
