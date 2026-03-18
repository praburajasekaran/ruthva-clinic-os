---
title: Automated TypeScript Type Checking and ESLint Enforcement Setup
date: 2026-03-18
category: developer-experience
tags:
  - TypeScript
  - GitHub Actions
  - Husky
  - ESLint
  - Next.js
  - lint-staged
  - CI/CD
severity: medium
component: frontend
symptoms:
  - Type checking only ran manually or during deployment
  - No automated enforcement of strict TypeScript rules
  - ESLint violations not caught before commit
  - Dual lockfiles (pnpm-lock.yaml and package-lock.json)
  - Monorepo-like structure with .git at root but package.json in frontend/
root_cause: Lack of automated CI pipeline and pre-commit hooks to enforce type safety and linting
resolution_summary: Implemented GitHub Actions CI workflow + Husky pre-commit hooks with smart frontend-only guard, standardized on npm, pinned Node version
---

# Automated TypeScript Type Checking and ESLint Enforcement Setup

## Problem

A Next.js 14 TypeScript project had strict type checking enabled (`strict: true`, zero `any` usage, zero `@ts-ignore`) but no automated enforcement mechanism. TypeScript errors could slip into commits and be pushed to main without detection, only surfacing at deployment time when the build would fail.

## Root Cause

Three structural issues prevented standard pre-commit hook setup:

1. **Repository layout mismatch**: `.git/` directory at repo root, but `package.json` and all dependencies in `frontend/` subdirectory. Husky installs hooks relative to `.git` and cannot directly access nested project dependencies.

2. **Divergent lock files**: Both `pnpm-lock.yaml` and `package-lock.json` existed simultaneously, creating risk of different dependency resolution between local development and CI environments.

3. **No Node version pinning**: No `.nvmrc` or `.node-version` file existed, so developers and CI could use different Node versions with inconsistent type checking behavior.

## Solution

### 1. Root-level Husky setup

Created a root `package.json` to manage Husky from the `.git` parent directory:

```json
{
  "private": true,
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9"
  }
}
```

### 2. Smart pre-commit hook with frontend-only guard

`.husky/pre-commit`:

```bash
# Only run frontend checks if frontend files are staged
if git diff --cached --name-only | grep -q '^frontend/'; then
  cd frontend

  # Full project typecheck (types cascade across files)
  npm run typecheck

  # Lint only staged files via lint-staged
  npx lint-staged
fi
```

The guard checks if any staged files are in `frontend/`. Backend-only commits skip frontend checks entirely.

### 3. Lint-staged configuration

Added to `frontend/package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "next lint --fix --file"
  }
}
```

Full `tsc --noEmit` runs on the entire project (types cascade across files), while ESLint runs only on staged files via lint-staged (faster, sufficient for style rules).

### 4. GitHub Actions CI workflow

`.github/workflows/typecheck-lint.yml`:

```yaml
name: Typecheck & Lint

on:
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  typecheck-lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
```

### 5. Cleanup

- Deleted `pnpm-lock.yaml` (standardized on npm since `package-lock.json` was more recent)
- Created `.nvmrc` with `22` at repo root
- Added `"ci:check": "npm run typecheck && npm run lint"` convenience script

## Key Discovery: GitHub Branch Protection Limitation

**GitHub branch protection rules do NOT enforce CI check failures on private repositories without a Team or Enterprise plan.** The CI workflow runs and reports pass/fail status on PRs, but GitHub will not block merges based on that status on the free plan.

**Consequence:** The pre-commit hook becomes the primary safety net. The CI check acts as a secondary verification but cannot prevent merges to main.

**Workarounds:**
- Enforce merge discipline through team process (code review before merge)
- Consider upgrading to GitHub Team ($4/user/month) when team grows to 3+ members
- The pre-commit hook catches most issues before they're even pushed

## Prevention Strategies

### Maintaining Type Safety

- **Dual enforcement layer:** Keep typecheck in both pre-commit (local) and CI (remote) — defense in depth
- **Full project typecheck in hooks:** Never use staged-only type checking. A type change in `types.ts` can break any consuming file
- **Never add `ignoreBuildErrors`:** The project previously removed this flag (commit `8e9862b`) — keep it off

### Husky in Monorepo-Like Structures

- Root `package.json` manages Husky; hook scripts `cd` into the correct subdirectory
- Always scope hooks with a staged-file guard to avoid unnecessary runs
- CI must mirror the local setup: same Node version, same package manager, same commands

### Verification Steps

```bash
# Verify hook catches type errors
echo "const x: string = 123;" >> frontend/src/test.ts
git add frontend/src/test.ts
git commit -m "test"  # Should fail

# Verify hook skips non-frontend changes
echo "test" >> README.md
git add README.md
git commit -m "docs"  # Should succeed without running typecheck

# Verify CI locally
cd frontend && npm run ci:check
```

## Related Documents

- Brainstorm: `docs/brainstorms/2026-03-18-ci-typecheck-enforcement-brainstorm.md`
- Plan: `docs/plans/2026-03-18-feat-ci-typecheck-lint-enforcement-plan.md`
- Prior fix: `docs/plans/2026-03-18-fix-typescript-eslint-build-checks-plan.md` (re-enabled build checks)
- PR: https://github.com/praburajasekaran/ruthva-clinic-os/pull/33

## Enforcement Layers Summary

| Layer | Tool | Purpose | Scope |
|-------|------|---------|-------|
| Local (pre-commit) | Husky + lint-staged | Fail fast, prevent pushing broken code | Frontend files only |
| Remote (CI) | GitHub Actions | Catch bypasses, verify in clean environment | All PRs to main |
| Policy | Code review process | Enforce checks before merging (free plan) | All PRs |
| Future | Branch protection | Auto-block non-compliant merges (Team plan) | Main branch |
