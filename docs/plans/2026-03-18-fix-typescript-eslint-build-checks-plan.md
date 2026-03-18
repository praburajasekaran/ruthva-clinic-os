---
title: Fix TypeScript/ESLint Errors and Re-enable Build Checks
type: fix
status: completed
date: 2026-03-18
---

# Fix TypeScript/ESLint Errors and Re-enable Build Checks

## Overview

`next.config.mjs` currently skips both ESLint and TypeScript checking during builds (`ignoreDuringBuilds: true`, `ignoreBuildErrors: true`). This was added to unblock Railway deployments but means broken code can ship silently. Goal: fix all errors, remove the ignore flags, and add a `typecheck` script.

## Problem Statement

- **Commit `fee5f26`** disabled ESLint during builds to unblock Railway
- **Commit `d99a16b`** disabled TypeScript checking for the same reason
- No CI/CD pipeline exists to catch errors separately
- Errors accumulate silently, making re-enablement harder over time

## Current State (from static analysis)

**Known ESLint issues:**
- 4 uses of `<img>` instead of Next.js `<Image>` component:
  - `frontend/src/components/layout/Sidebar.tsx:87` (has eslint-disable)
  - `frontend/src/app/(dashboard)/layout.tsx:37` (no disable comment)
  - `frontend/src/app/(dashboard)/settings/page.tsx:348` (has eslint-disable)
  - `frontend/src/app/login/page.tsx:95` (no disable comment)

**Positive signals:**
- No `@ts-ignore` or `@ts-nocheck` directives found
- No explicit `any` types found
- All client-side pages already have `"use client"` directives
- Only 2 eslint-disable comments in the entire codebase

**Unknown (requires Node.js):**
- Full TypeScript type errors (need `tsc --noEmit`)
- Full ESLint errors (need `next lint`)
- Cannot run these locally — no Node.js installed on this machine

## Proposed Solution

### Phase 1: Install Node.js locally

- [ ] Install Node.js via Homebrew (`brew install node`) or nvm
- [ ] Run `npm install` in `frontend/`

### Phase 2: Run diagnostics and capture all errors

- [ ] Run `npx tsc --noEmit 2>&1 | tee /tmp/ts-errors.txt` to capture all TypeScript errors
- [ ] Run `npx next lint 2>&1 | tee /tmp/eslint-errors.txt` to capture all ESLint errors
- [ ] Triage errors by category and count

### Phase 3: Fix ESLint errors

- [ ] Replace `<img>` with Next.js `<Image>` in files without eslint-disable comments:
  - `frontend/src/app/(dashboard)/layout.tsx:37`
  - `frontend/src/app/login/page.tsx:95`
- [ ] Decide on files WITH eslint-disable comments — either:
  - Convert to `<Image>` and remove the disable comment, OR
  - Keep the disable if there's a valid reason (e.g., external URL images)
- [ ] Fix any other ESLint errors found in Phase 2

### Phase 4: Fix TypeScript errors

- [ ] Fix all type errors found by `tsc --noEmit`
- [ ] Common patterns to watch for:
  - Missing type annotations on function parameters
  - Implicit `any` from API responses (axios calls)
  - Missing null checks on optional properties
  - Type mismatches in component props

### Phase 5: Re-enable build checks

- [ ] Remove `eslint.ignoreDuringBuilds` from `frontend/next.config.mjs`
- [ ] Remove `typescript.ignoreBuildErrors` from `frontend/next.config.mjs`
- [ ] Add `"typecheck": "tsc --noEmit"` script to `frontend/package.json`
- [ ] Run `npm run build` to verify clean build
- [ ] Run `npm run lint` to verify clean lint
- [ ] Run `npm run typecheck` to verify clean types

### Phase 6: Verify Railway deployment

- [ ] Push changes and confirm Railway build succeeds with checks enabled

## Acceptance Criteria

- [ ] `npm run build` passes with no TypeScript or ESLint errors
- [ ] `npm run lint` passes cleanly
- [ ] `npm run typecheck` passes cleanly
- [ ] `next.config.mjs` has no `ignoreDuringBuilds` or `ignoreBuildErrors`
- [ ] Railway deployment succeeds

## References

- `frontend/next.config.mjs` — config to modify
- `frontend/.eslintrc.json` — ESLint config (extends `next/core-web-vitals`, `next/typescript`)
- `frontend/tsconfig.json` — TypeScript config (`strict: true`)
- Commit `fee5f26` — when ESLint was disabled
- Commit `d99a16b` — when TypeScript was disabled
