---
title: "feat: Add CI and pre-commit typecheck + lint enforcement"
type: feat
status: completed
date: 2026-03-18
---

# feat: Add CI and pre-commit typecheck + lint enforcement

## Overview

Add automated TypeScript type checking and ESLint enforcement via GitHub Actions CI (on PRs to main) and Husky pre-commit hooks (locally). The codebase already has `strict: true`, zero type errors, and working `typecheck`/`lint` scripts — this closes the gap of no automated enforcement.

## Problem Statement / Motivation

Type checking only runs when manually invoked or during deployment builds. Broken types can be pushed and only caught late in the deployment pipeline. This adds two layers of defense:

- **Pre-commit hooks** — fast local feedback before code leaves the developer's machine
- **GitHub Actions CI** — catches anything that slips through (skipped hooks, new contributors)

## Structural Decisions

### Package manager: npm

`package-lock.json` is more recent and actively maintained. Delete `pnpm-lock.yaml` to avoid divergent dependency resolution.

### Husky directory structure

Since `.git/` is at the repo root but `package.json` is in `frontend/`, Husky must be configured at the root level:

- Create a minimal root `package.json` with `"prepare": "husky"` script
- Install `husky` as a root devDependency
- `.husky/pre-commit` hook will `cd frontend` before running commands
- `lint-staged` config lives in `frontend/package.json` (where the lint tooling is)

### Node version pinning

Create `.nvmrc` at repo root with `22` so CI and local dev use the same major version.

## Proposed Solution

### Phase 1: Cleanup & Foundation

**Files to create/modify:**

- [x] Delete `frontend/pnpm-lock.yaml`
- [x] Create `.nvmrc` at repo root

```
22
```

- [x] Create root `package.json`

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

- [x] Run `npm install` at repo root to install Husky and generate root `package-lock.json`
- [x] Add convenience script to `frontend/package.json`

```json
{
  "scripts": {
    "ci:check": "npm run typecheck && npm run lint"
  }
}
```

### Phase 2: Pre-commit Hook (Husky + lint-staged)

**Files to create/modify:**

- [x] Run `npx husky init` at repo root to create `.husky/` directory
- [x] Create `.husky/pre-commit`

```bash
#!/bin/sh

# Only run frontend checks if frontend files are staged
if git diff --cached --name-only | grep -q '^frontend/'; then
  cd frontend

  # Full project typecheck (types cascade across files)
  npm run typecheck

  # Lint only staged files via lint-staged
  npx lint-staged
fi
```

- [x] Install lint-staged in `frontend/`

```bash
cd frontend && npm install --save-dev lint-staged
```

- [x] Add lint-staged config to `frontend/package.json`

```json
{
  "lint-staged": {
    "*.{ts,tsx}": "next lint --fix --file"
  }
}
```

### Phase 3: GitHub Actions CI

**File to create:** `.github/workflows/typecheck-lint.yml`

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

### Phase 4: Branch Protection (Manual)

- [ ] In GitHub repo settings → Branches → Branch protection rules for `main`:
  - Require status checks to pass before merging
  - Add "Typecheck & Lint" as a required check
  - This step requires repository admin access and must be done manually in the GitHub UI

## Acceptance Criteria

- [ ] `tsc --noEmit` runs automatically on every commit that touches `frontend/` files
- [ ] `next lint` runs on staged `.ts/.tsx` files via lint-staged on commit
- [ ] Commits touching only non-frontend files skip frontend checks
- [ ] GitHub Actions runs typecheck + lint on every PR to `main`
- [ ] CI uses dependency caching for fast runs
- [ ] CI cancels in-progress runs when new commits are pushed to the same PR
- [ ] `.nvmrc` pins Node version for consistency
- [ ] `pnpm-lock.yaml` is removed to avoid lockfile confusion
- [ ] `npm run ci:check` convenience script works locally

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pre-commit hook slows down commits | Medium | Guard skips non-frontend commits; `tsc --incremental` can be added later if needed |
| Developers bypass with `--no-verify` | Low | CI catches everything on PRs |
| Branch protection not configured | High | Document as manual step; verify after setup |

## References

- Brainstorm: `docs/brainstorms/2026-03-18-ci-typecheck-enforcement-brainstorm.md`
- TypeScript config: `frontend/tsconfig.json`
- Existing scripts: `frontend/package.json` (`typecheck`, `lint`)
- ESLint config: `frontend/.eslintrc.json`
