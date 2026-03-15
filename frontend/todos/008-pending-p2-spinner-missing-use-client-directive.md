---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, typescript, nextjs, react]
dependencies: []
---

# 008 — Spinner: missing `"use client"` directive

## Problem Statement

`src/components/ui/Spinner.tsx` renders a DOM element with runtime Tailwind classes and exports a named component. It has no `"use client"` directive. In Next.js 14 App Router, components without this directive are treated as Server Components by default. All current usages are within `"use client"` component trees, so this works today. However, if `<Spinner>` is ever imported directly by a Server Component (e.g. a loading.tsx or a server page), it will cause a hydration mismatch or a build error because Server Components cannot render interactive client-side elements with `motion-safe:animate-spin` (a Tailwind utility that depends on a media query, evaluated client-side).

## Findings

- **File:** `src/components/ui/Spinner.tsx` — no `"use client"` at top
- All peer `ui/` components (`Button`, `Input`, `Modal`, etc.) have `"use client"`.
- The `Spinner` component is used in 16+ pages and components (all currently client-side).
- Next.js App Router: https://nextjs.org/docs/app/building-your-application/rendering/client-components

## Proposed Solutions

### Option A — Add `"use client"` directive (Recommended)
Add `"use client";` as the first line of `Spinner.tsx`.
- Pros: Consistent with all other ui/ components; eliminates latent hydration risk.
- Cons: None.
- Effort: Trivial
- Risk: None

### Option B — No change (accept current behaviour)
Since all current usages are inside client trees, the bug is latent.
- Pros: Zero effort.
- Cons: Technical debt; easy to introduce the bug accidentally.
- Effort: None
- Risk: Low (currently), Medium (as codebase grows)

## Recommended Action

Implement Option A.

## Technical Details

- **Affected files:** `src/components/ui/Spinner.tsx`

## Acceptance Criteria

- [ ] `"use client";` is the first line of `Spinner.tsx`.
- [ ] TypeScript build passes with no new errors.

## Work Log

- 2026-03-14: Identified during a11y code review of feat/ruthva-branding-otp-login.
