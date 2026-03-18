# CI & Pre-commit Type Check Enforcement

**Date:** 2026-03-18
**Status:** Ready for planning

## What We're Building

Automated enforcement of TypeScript type checking and ESLint linting via two mechanisms:

1. **GitHub Actions CI** — Runs `tsc --noEmit` and `next lint` on every PR to the main branch
2. **Pre-commit hook (Husky + lint-staged)** — Runs full project typecheck and ESLint on staged files before each commit

## Why This Approach

The codebase already has strong type safety fundamentals:
- `strict: true` in tsconfig.json
- Zero `any` usage, zero `@ts-ignore` directives
- A working `npm run typecheck` script
- Builds fail on type errors (no `ignoreBuildErrors` flags)

The gap is that type checking only runs when someone manually invokes it or during deployment builds. This means broken types could be pushed and only caught late.

**Both CI and pre-commit together** provides defense in depth:
- Pre-commit gives fast local feedback before code leaves the developer's machine
- CI catches anything that slips through (skipped hooks, new contributors, etc.)

## Key Decisions

- **Full project typecheck in pre-commit** — `tsc --noEmit` checks the entire project because type errors can cascade across files. A change in `types.ts` can break any consuming file.
- **lint-staged for ESLint only** — ESLint can efficiently check only staged `.ts`/`.tsx` files since lint rules are file-scoped.
- **Typecheck + Lint enforced together** — Both `tsc --noEmit` and `next lint` run in CI and pre-commit.
- **CI triggers on PRs to main branch** — Standard PR gate pattern.

## Scope

### In Scope
- GitHub Actions workflow file (`.github/workflows/typecheck.yml`)
- Husky pre-commit hook setup
- lint-staged configuration for ESLint on staged files
- Full `tsc --noEmit` in pre-commit hook

### Out of Scope
- Backend (Python/Django) linting or type checking
- Test runner integration
- Stricter TypeScript flags beyond current `strict: true`

## Open Questions

None — all decisions resolved during brainstorming.
