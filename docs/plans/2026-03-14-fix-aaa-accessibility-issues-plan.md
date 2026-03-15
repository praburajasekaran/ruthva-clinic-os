---
title: "fix: WCAG 2.1 AAA Accessibility Audit & Remediation"
type: fix
status: active
date: 2026-03-14
deepened: 2026-03-14
---

# fix: WCAG 2.1 AAA Accessibility Audit & Remediation

## Enhancement Summary

**Deepened:** 2026-03-14
**Research agents:** framework-docs, best-practices, julik-race-reviewer, kieran-typescript, performance-oracle, security-sentinel, code-simplicity, architecture-strategist, pattern-recognition, agent-native
**Sections enhanced:** All groups (A–C) + new Phase 0 added

### Critical Corrections from Research

> These are **bugs in the original plan** that must be fixed before implementation:

| # | Correction | Location |
|---|---|---|
| 1 | Settings `Tab` type in plan is **wrong** — actual type is `'profile' \| 'clinic' \| 'usage' \| 'portability'` (no `'security'`) | C4 |
| 2 | `role="alert"` already implies `aria-live="assertive"` — remove the redundant `aria-live="assertive"` attribute | B4 |
| 3 | `FormSection` `title` prop is typed as `ReactNode`, not `string` — `title.toLowerCase()` will throw a TypeError; use `useId()` instead | B5 |
| 4 | `inert` not in `@types/react@18.3.28` — requires module augmentation (`src/types/react-augment.d.ts`) | C2 |
| 5 | `mobileOpen` is local to `Sidebar.tsx` — must be lifted to `DashboardLayout` before `inert` can be applied to `<main>` | C2 |
| 6 | `hidden` attribute does **not** exclude form fields from submission — `FormSection` sections with `required` fields (e.g. Change Password) will block form submission silently | B5 |
| 7 | Modal `previousFocusRef` cleanup fires in React 18 StrictMode while modal is still open — add `if (open)` guard to cleanup body | C1 |
| 8 | `aria-activedescendant` must be `undefined` (not `""`) when nothing is active | C3 |
| 9 | `/pharmacy/{id}` route does not exist — fix before making rows keyboard-accessible in B3 | B3 |

### Key Improvements from Research

1. **Phase 0 added**: `@axe-core/playwright` test infrastructure + `<Spinner>` primitive + `useFocusTrap` hook + `src/types/react-augment.d.ts` must precede all other work
2. **Native `<dialog>`** replaces the hand-rolled focus trap in Modal.tsx (eliminates ~15 lines of effect code)
3. **`useId()`** replaces title-based ID generation in FormSection
4. **`scrollIntoView`** is a mandatory APG requirement in MedicineAutocomplete keyboard navigation
5. **Roving tabindex via `tabRefs` array** is the correct React 18 pattern for settings tab focus movement
6. **OTP resend cooldown** (30-60s) must be added alongside the resend handler fix (security)
7. **`UsageDashboard` tab** must stay conditionally rendered (fetches data on mount) — do not switch to `hidden`
8. **Cache `querySelectorAll`** result in `useRef` — do not re-query on every keydown

---

## Overview

A comprehensive remediation of 13 identified WCAG 2.1 AAA accessibility failures across the Sivanethram Next.js frontend, plus 5 high-priority gaps uncovered during SpecFlow analysis. Issues range from color contrast failures and missing focus rings to broken ARIA patterns and unreachable keyboard interactions.

**Reference implementations in the codebase (use as models):**
- `CommandPalette.tsx` — gold-standard combobox ARIA pattern (`role="combobox"`, `aria-activedescendant`, `role="listbox"`, `role="option"`, live region)
- `FormField.tsx` — gold-standard error ARIA pattern (`aria-invalid`, `aria-describedby`, `role="alert"`)
- `Modal.tsx` — partially correct (needs focus trap hardening → migrate to native `<dialog>`)

---

## Problem Statement

The frontend currently fails WCAG 2.1 AAA on multiple fronts. The most critical failures affect keyboard-only users who cannot access patient records (clickable `<tr>` rows with no keyboard equivalent) or navigate medication dropdowns. Screen reader users receive no announcement of loading states, form errors on the login page, or step transitions in the OTP flow. These are functional barriers, not cosmetic issues.

---

## Technical Approach

### Architecture

All changes are confined to the Next.js frontend at `frontend/src/`. No backend changes required. Fixes are grouped by blast radius, with a new Phase 0 that creates shared infrastructure before any per-file changes.

- **Phase 0** — Infrastructure: test tooling, shared primitives, type augmentations
- **Group A** — Global, low-risk token/CSS changes and annotations
- **Group B** — Component-level markup fixes
- **Group C** — Interactive pattern rewrites (ARIA combobox, focus trap, tab panel)

### Key Decisions (Confirmed by Research)

| Decision | Choice | Rationale |
|---|---|---|
| Table row keyboard access | `<Link>` wrapping primary cell + `tabIndex={0}` + `onKeyDown` Enter/Space on `<tr>` | Link-in-cell is the ARIA-preferred pattern |
| Mobile sidebar focus trap | `inert` attribute on `<main>` when `mobileOpen` is true (after state lift to layout) | `inert` is browser-native, low-cost |
| FormSection panel rendering | Always render panel; use `hidden={!isOpen}` — **but only for sections without `required` fields**; keep conditional render for Change Password section | `hidden` does not exclude fields from form submission |
| FormSection panel ID | `useId()` from React 18 — not generated from `title` (`title: ReactNode`, not `string`) | `useId()` is SSR-safe, guaranteed unique, stable |
| Settings tabs — URL sync | Local state only; fixed `id` strings for `aria-controls` | Keeps implementation simple |
| Settings tabs — Tab type | `'profile' \| 'clinic' \| 'usage' \| 'portability'` (4 tabs, not 3) | Matches actual codebase |
| Settings tabs focus | `tabRefs` array + `tabRefs.current[nextTab]?.focus()` — safe because tab buttons are always in DOM | React 18 state updates don't need `flushSync` for already-mounted elements |
| Settings `UsageDashboard` tab | Keep conditionally rendered — it fetches data on mount | Always-rendered would fire API calls on settings page load |
| MedicineAutocomplete navigation | `aria-activedescendant` + Arrow key pattern (matching CommandPalette) | APG-correct; avoids blur race entirely |
| MedicineAutocomplete `scrollIntoView` | Required per APG — call in `useEffect` watching `activeIndex` | APG mandatory requirement |
| `AlertTriangle` icon (low stock) | Informative — add `aria-label="Low stock"` instead of `aria-hidden` | Icon carries semantic meaning not in adjacent text |
| Button `isLoading` | `aria-busy={isLoading}` on button + `aria-hidden="true"` on Loader2 | `aria-busy` well-supported; leaves button label unchanged |
| `prefers-reduced-motion` modal | `animation: none` (fully instant) under reduced motion | WCAG 2.3.3 allows instant appearance |
| Skip nav placement | Dashboard layout only (`(dashboard)/layout.tsx`), not root layout | Login/signup have no sidebar to skip |
| OTP step transition | Add `aria-live="polite"` region for step announcement | Separate from error `role="alert"` |
| Modal — focus trap | Native `<dialog>` element (eliminates all manual focus trap code) | Browser-native, ~15 lines removed |
| `role="alert"` | Use `role="alert"` alone — do not add `aria-live="assertive"` (redundant) | `role="alert"` implies `aria-live="assertive"` |
| `aria-live` container mounting | Always render the container empty before injecting content | NVDA+Firefox misses announcements if container mounts with content |
| `inert` TypeScript | Module augmentation at `src/types/react-augment.d.ts` using `inert?: '' \| undefined` | `@types/react@18.3.28` does not include `inert` |
| `querySelectorAll` in focus traps | Cache result in `useRef`, query only on open — not on every keydown | Per-keydown query on large modals is measurable |
| Spinner pattern | Extract `<Spinner>` primitive to `src/components/ui/Spinner.tsx` | 11 callsites; per-file edits create future drift |

---

## Implementation Phases

---

### Phase 0 — Infrastructure (Before Any Per-File Changes)

> These items must exist before implementing anything in Groups A–C, because they are referenced by those changes.

#### P0.1. Accessibility Test Infrastructure

**Why first:** The plan's success criterion is "zero axe-core violations". This is currently unmeasurable — there is zero test tooling. Without it, there is no definition of done.

**Add `@axe-core/playwright`:**

```bash
# Install
npm install --save-dev @axe-core/playwright @playwright/test
npx playwright install chromium
```

Create `playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/a11y',
  use: { baseURL: 'http://localhost:3000', viewport: { width: 1280, height: 720 } },
});
```

Create `tests/a11y/accessibility.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/login', '/', '/patients', '/consultations', '/pharmacy', '/settings'];

for (const route of routes) {
  test(`${route} has no WCAG AAA violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aaa', 'wcag21aaa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

> **Note:** Always run at `viewport: { width: 1280, height: 720 }` (desktop) so `mobileOpen` never becomes `true` and `inert` on `<main>` does not block test interactions. Document this constraint.

#### P0.2. `<Spinner>` Primitive

**File:** `frontend/src/components/ui/Spinner.tsx`
**Why:** 11+ spinner callsites; per-file `role="status"` edits create drift. One component enforces compliance automatically.

```tsx
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', label = 'Loading…', className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        sizeClasses[size],
        'motion-safe:animate-spin rounded-full border-emerald-200 border-t-emerald-600',
        className
      )}
    />
  );
}
```

Replace all 11 raw spinner divs across: `AuthGuard.tsx`, `patients/[id]/page.tsx`, `consultations/[id]/page.tsx`, `follow-ups/page.tsx`, `treatments/plans/[id]/page.tsx`, `prescriptions/[id]/page.tsx`, `prescriptions/[id]/edit/page.tsx`, `consultations/[id]/edit/page.tsx`, `patients/[id]/consultations/new/page.tsx`, `PatientTable.tsx`, `Button.tsx` (replace Loader2 with `<Spinner size="sm" aria-hidden="true" />`).

#### P0.3. TypeScript Module Augmentation for `inert`

**File:** `frontend/src/types/react-augment.d.ts`

```ts
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    /**
     * The inert attribute makes an element and all descendants non-interactive
     * and invisible to the accessibility tree.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
     * Note: @types/react@18.3.28 does not include inert — this augmentation adds it.
     * Usage: inert={condition ? '' : undefined}
     */
    inert?: '' | undefined;
  }
}
```

#### P0.4. `useFocusTrap` Hook

**File:** `frontend/src/hooks/useFocusTrap.ts`
**Why:** Modal.tsx and mobile Sidebar share the same "trap focus within a region" problem. Centralising prevents two implementations from diverging.

```ts
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, isActive: boolean) {
  // Cache focusables on activation — not on every keydown
  const focusablesRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (!isActive || !ref.current) return;
    focusablesRef.current = Array.from(
      ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(el => !el.closest('[hidden]'));
    focusablesRef.current[0]?.focus();
  }, [isActive, ref]);

  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const els = focusablesRef.current;
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      // Use e.target instead of document.activeElement — more reliable in Safari
      if (e.shiftKey && e.target === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && e.target === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
```

> **StrictMode note:** The `useEffect` cleanup correctly removes the listener. `focusablesRef.current[0]?.focus()` fires on the second mount (StrictMode remount), which is fine — the modal is open and the element is present.

---

### Group A — Global Low-Risk Changes

#### A1. Color Contrast Tokens (`globals.css`)

**WCAG:** 1.4.6 AAA (7:1 normal text), 1.4.3 AA (4.5:1)

**File:** `frontend/src/app/globals.css` lines 32–33

**Changes:**
- Darken `--color-text-secondary: #546156` → `#3d4d3f` (achieves ~7.5:1 on `#fffdf8`)
- Darken `--color-text-muted: #7a8479` → `#555f57` (achieves ~7:1 on `#fffdf8`)
- Change all `placeholder:text-gray-400` → `placeholder:text-gray-500` globally

Files: `Input.tsx:14`, `Select.tsx:16`, `login/page.tsx`, `signup/page.tsx`, `PatientForm.tsx`, `ConsultationForm.tsx`, `PrescriptionBuilder.tsx`, `Sidebar.tsx:98`

> **Verification:** Run `new AxeBuilder({ page }).withTags(['wcag2aaa'])` after deploying — all contrast violations should clear.

> **Design note:** `#3d4d3f` and `#555f57` both preserve the warm sage-green hue of the Ruthva palette while meeting AAA. Adjust to the nearest AAA-passing value that feels right visually, then lock it in the CSS variable.

#### A2. Skip Navigation Link (`(dashboard)/layout.tsx`)

**WCAG:** 2.4.1 A (prerequisite for AAA)

**File:** `frontend/src/app/(dashboard)/layout.tsx`

**Changes:**
- Add skip link as the **first child** of the layout (must be in DOM before `<Sidebar>`):
  ```tsx
  {/* Skip link: use focus: not focus-visible: — this is the documented Tailwind pattern */}
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white focus:ring-2 focus:ring-white"
  >
    Skip to main content
  </a>
  ```
- Add `id="main-content"` to the `<main>` element

> **Research finding:** Use `focus:not-sr-only` (not `focus-visible:not-sr-only`). Tailwind v3's `sr-only` uses `clip: rect()` (not `clip-path`) — this is correct behaviour for v3.4.x.

#### A3. Reduced Motion Guards (`globals.css` + components)

**WCAG:** 2.3.3 AAA

**File:** `frontend/src/app/globals.css` lines 67–76

**Changes in `globals.css`:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Under reduced motion: instant appearance, no transform */
@media (prefers-reduced-motion: reduce) {
  @keyframes fadeIn {
    from { opacity: 1; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 1; }
    to { opacity: 1; }
  }
}
```

**Changes in Tailwind classes** — replace `animate-spin` with `motion-safe:animate-spin` (handled by `<Spinner>` primitive from P0.2).

Dashboard `page.tsx:231` — add `motion-safe:hover:-translate-y-0.5` guard.

> **Research note:** `motion-safe:` compiles to `@media (prefers-reduced-motion: no-preference)`. Users with reduced motion preference see a static icon from `<Spinner>` — this is acceptable (they opted out of animation). The `role="status"` and `aria-label` on the spinner container still announces the loading state to AT regardless of motion preference.

#### A4. Loading Spinners — Replaced by `<Spinner>` Primitive

All spinner instances are replaced by `<Spinner>` from P0.2. This item is automatically resolved by the primitive. See P0.2 for file list.

#### A5. Decorative Icons — `aria-hidden="true"`

**WCAG:** 1.1.1 Non-text Content

Add `aria-hidden="true"` to all Lucide icons rendered alongside visible text labels:

| File | Icons to mark `aria-hidden` |
|---|---|
| `Sidebar.tsx:120` | All `<item.icon>` nav icons |
| `Sidebar.tsx:101` | `Search` icon |
| `Sidebar.tsx:157` | `LogOut` icon |
| `Sidebar.tsx:87` | `X` close icon (mobile) |
| `Sidebar.tsx:173` | `Menu` hamburger icon |
| `PatientBanner.tsx:32` | `Phone` icon |
| `PatientBanner.tsx:41` | Alert icon |
| `PatientTable.tsx:61` | `Search` icon |
| `DoshaChip.tsx:44` | Wind/Flame/Droplet icons |
| `Button.tsx:52` | `Loader2` icon (replaced by `<Spinner aria-hidden />` from P0.2) |

**Exception — informative icons (do NOT add `aria-hidden`):**
- `MedicineCatalogTable.tsx:107` — `AlertTriangle` when `med.is_low_stock` → add `aria-label="Low stock"` instead
- `Sidebar.tsx:129` — Follow-ups count badge → add `aria-label` describing count+type
- `Sidebar.tsx:134` — Low stock pharmacy badge → add `aria-label` describing count+type

Add `aria-hidden="true"` to `KbdBadge` content in `Sidebar.tsx` nav items (shortcut keys are visual hints only).

> **Contributing note:** Establish a project convention that all new Lucide icon usages alongside text labels must include `aria-hidden="true"`. Add to CONTRIBUTING.md or a code-review checklist.

---

### Group B — Component-Level Markup Fixes

#### B1. Focus Ring Standardisation

**WCAG:** 2.4.11 / 2.4.12 AAA

Standardise to `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600`. Remove any `focus:outline-none` without a corresponding visible focus indicator.

> **Important distinction:** `focus:ring` fires on mouse clicks; `focus-visible:ring` fires only on keyboard navigation. All instances below must change from `focus:` to `focus-visible:`.

| File | Current | Change to |
|---|---|---|
| `Input.tsx:14` | `focus-visible:ring-1` | `focus-visible:ring-2 focus-visible:ring-offset-2` |
| `Select.tsx:16` | `focus-visible:ring-1` | `focus-visible:ring-2 focus-visible:ring-offset-2` |
| `login/page.tsx:110,148,155` | `focus:outline-none focus:ring-1` | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2` |
| `signup/page.tsx` (all inputs) | `focus:outline-none` | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2` |
| `MedicineAutocomplete.tsx:47` | `focus:ring-1` | `focus-visible:ring-2 focus-visible:ring-offset-2` |
| `MedicineForm.tsx:129,142` | `focus:outline-none` (select, no ring!) | Add `focus-visible:ring-2 focus-visible:ring-offset-2` |
| `MedicineForm.tsx:111,120,157,167` | `focus:ring-1` | `focus-visible:ring-2 focus-visible:ring-offset-2` |
| `MedicineCatalogTable.tsx:49,55` | `focus:outline-none` (no ring!) | Add `focus-visible:ring-2 focus-visible:ring-offset-2` |
| `CommandPalette.tsx:209` | `focus:outline-none` (no ring!) | Add `focus-visible:ring-2 focus-visible:ring-offset-2` |

> **Root cause:** Every instance of raw `<input>` or `<select>` that bypasses the `Input.tsx`/`Select.tsx` primitives is a source of focus ring violations. Consider routing pharmacy/treatment raw inputs through the primitives as a follow-on.

#### B2. Table Accessibility — `scope="col"` and `aria-label`

**WCAG:** 1.3.1 Info and Relationships

Add `scope="col"` to every `<th>` and `aria-label` to every `<table>`:

| File | Change |
|---|---|
| `PatientTable.tsx:119–135` | Add `scope="col"` to all 6 `<th>`; add `aria-label="Patients"` to `<table>` |
| `consultations/page.tsx:70–85` | Add `scope="col"` to all 5 `<th>`; add `aria-label="Consultations"` to `<table>` |
| `MedicineCatalogTable.tsx:77–85` | Add `scope="col"` to all 7 `<th>`; add `aria-label="Medicine catalog"` to `<table>` |

#### B3. Table Rows — Keyboard Accessibility

**WCAG:** 2.1.1 Keyboard (AA, prerequisite for AAA)

> ⚠️ **Fix `/pharmacy/{id}` 404 first.** `MedicineCatalogTable.tsx:98` calls `router.push('/pharmacy/${med.id}')` but this route does not exist. Making rows keyboard-accessible will surface this bug to keyboard users. Either create the route or change the row action to open the inline `MedicineForm` before implementing this item.

**Approach:** Wrap the primary cell's content in `<Link href={...}>` (for navigation rows). Add `tabIndex={0}` + `onKeyDown` on `<tr>`.

> **Anti-pattern warning:** `tabIndex={0}` on `<tr>` alone (without `onKeyDown`) is an anti-pattern — it traps keyboard focus on an element that cannot be activated. Both must be added together.

| File | Change |
|---|---|
| `PatientTable.tsx:141–173` | Wrap patient name cell in `<Link href={/patients/${patient.id}}>`. Add `tabIndex={0}` and `onKeyDown={e => { if (e.key === 'Enter' \|\| e.key === ' ') { e.preventDefault(); router.push(...) } }}` on `<tr>` |
| `consultations/page.tsx:91–121` | Same pattern — wrap primary cell in `<Link>`, add `tabIndex={0}` + `onKeyDown` on `<tr>` |
| `MedicineCatalogTable.tsx:95–138` | Add `tabIndex={0}` + `onKeyDown` on `<tr>` (opens inline form, no navigation) |

#### B4. Login Page Error ARIA

**WCAG:** 1.3.1 / 3.3.1 / 3.3.3

**File:** `frontend/src/app/login/page.tsx`

**Changes:**

1. Pre-render the error container (always in DOM, empty before error occurs — required for NVDA+Firefox):
   ```tsx
   {/* Always rendered — NVDA+Firefox miss announcements if container mounts with content */}
   <div id="login-error" role="alert" className={cn("...", !error && "hidden")}>
     {error}
   </div>
   ```
   > **Use `role="alert"` alone** — do not add `aria-live="assertive"`. `role="alert"` already implies `aria-live="assertive"` and `aria-atomic="true"`.

2. Add `aria-invalid={!!error}` and `aria-describedby="login-error"` to the email `<input>` (line 102) and code `<input>` (line 137). Conditionally — only when `error` is truthy.

3. Add an `aria-live="polite"` region for OTP step transitions (pre-rendered, empty until step changes):
   ```tsx
   {/* Pre-rendered live region for step transitions */}
   <div aria-live="polite" className="sr-only" aria-atomic="true">
     {step === 'otp' ? 'A verification code has been sent to your email.' : ''}
   </div>
   ```

4. Fix the resend button handler bug (line 175–181): `handleRequestOTP` expects a form event. Create a dedicated `handleResendOTP` that calls the API directly.

5. **Add OTP resend cooldown** (30-60 seconds) — security requirement: prevents OTP spam and email relay abuse:
   ```tsx
   const [resendCooldown, setResendCooldown] = useState(0);

   async function handleResendOTP() {
     if (resendCooldown > 0) return;
     await requestOTPDirectly(email);
     setResendCooldown(60);
     // Decrement every second
   }
   ```

> **Security note:** Server-provided error text from `response.data.detail` lands in this `role="alert"` region and is read aloud verbatim. Cap the length before rendering: `const safeError = msg?.slice(0, 200) ?? fallback`. This limits social-engineering payload via compromised API responses.

#### B5. FormSection — Add `aria-controls` + Panel `id`

**WCAG:** 4.1.2 Name, Role, Value

**File:** `frontend/src/components/forms/FormSection.tsx`

**Changes:**
1. Use `useId()` from React 18 for stable, SSR-safe IDs. Accept an optional `id` prop that overrides the generated one:
   ```tsx
   const generatedId = useId();
   const panelId = id ?? `form-section-${generatedId}`;
   ```
   > **Do NOT** use `title.toLowerCase().replace(/\s+/g, '-')` — `title` is typed as `ReactNode`, not `string`. Calling `.toLowerCase()` on a React element throws a TypeError.

2. Add `aria-controls={panelId}` to the toggle `<button>`

3. For sections **without required fields** — switch to always-rendered panel:
   ```tsx
   <div id={panelId} hidden={!isOpen}>
     {children}
   </div>
   ```

4. For sections **with required fields** (e.g. Change Password with `required` password inputs) — keep conditional rendering `{isOpen && <div id={panelId}>...}`:
   > **`hidden` does not exclude fields from form submission.** A hidden `required` input will block the form submit event with no visible error message. Only use `hidden` for sections without required inputs.

5. Coordinate `aria-hidden` with `hidden`:
   ```tsx
   <div id={panelId} hidden={!isOpen} aria-hidden={!isOpen}>
   ```

#### B6. Settings Page — File Upload Input Label

**WCAG:** 1.3.1 / 4.1.2

**File:** `frontend/src/app/(dashboard)/settings/page.tsx` lines 438–444

Add `aria-label` to the hidden `<input type="file">`:
```tsx
<input
  type="file"
  ref={inputRef}
  className="hidden"
  aria-label="Upload file"
  accept=".pdf"
/>
```

Also associate the visible `<p>` label (line 438) with the input via `htmlFor` / `id` or move it into the `aria-label`.

#### B7. Settings Success States — Live Regions

**WCAG:** 4.1.3 Status Messages

**File:** `frontend/src/app/(dashboard)/settings/page.tsx`

For success spans in `ProfileSection` (line 188–192) and `ClinicSection` (line 413–418) — pre-render the container with `role="status"` and `aria-live="polite"`, change content when success occurs:

```tsx
{/* Pre-rendered — always in DOM so screen readers observe the mutation */}
<div role="status" aria-live="polite" className="sr-only" aria-atomic="true">
  {success ? 'Changes saved successfully.' : ''}
</div>
```

#### B8. Tamil Language Tag

**WCAG:** 3.1.2 Language of Parts

In `BilingualLabel` and anywhere Tamil text (`name_ta`) is rendered, wrap with `<span lang="ta">`:
```tsx
<span lang="ta">{name_ta}</span>
```

Files to update: `BilingualLabel.tsx:23` (the Tamil span), `DoshaChip.tsx:44`, and within the C3 MedicineAutocomplete rewrite (add `lang="ta"` to `medicine.name_ta` in each option).

> `lang` is already typed in `@types/react@18.3.28` as `lang?: string | undefined` — no module augmentation needed.

---

### Group C — Interactive Pattern Rewrites

#### C1. Modal — Migrate to Native `<dialog>`

**WCAG:** 2.1.2 No Keyboard Trap

**File:** `frontend/src/components/ui/Modal.tsx`

> **Simplicity recommendation:** Replace `<div role="dialog" aria-modal>` with native `<dialog>`. Browser-native `<dialog>` provides focus trapping, Escape handling, and `::backdrop` for free. This eliminates ~15 lines of `useEffect`, `requestAnimationFrame`, `previousFocusRef`, `document.addEventListener`, and `document.body.style.overflow` manipulation.

```tsx
// Open: dialogRef.current?.showModal()
// Close: dialogRef.current?.close()
// Trigger: onClose is called from the dialog's `onClose` event
// Focus: first focusable element in <dialog> is auto-focused (via autofocus attr or browser default)
// Focus return: browser automatically returns focus to the trigger element on close
// Backdrop: use CSS ::backdrop or a sibling div

<dialog
  ref={dialogRef}
  onClose={onClose}
  aria-labelledby={title ? 'modal-title' : undefined}
  aria-modal="true"
  className="..."
>
  {/* content */}
</dialog>
```

> **If native `<dialog>` is not feasible** (e.g. animation requirements, browser targeting): use `useFocusTrap` from P0.4 instead of hand-rolling it. Add `if (open)` guard to the cleanup function to prevent StrictMode double-mount from restoring focus while modal is still open.

> **Performance:** Cache the `querySelectorAll` result in a `useRef` on open — never call it on every keydown.

#### C2. Mobile Sidebar — Focus Trap via `inert`

**WCAG:** 2.1.2

**Files:** `frontend/src/app/(dashboard)/layout.tsx` and `frontend/src/components/layout/Sidebar.tsx`

**Prerequisite:** `src/types/react-augment.d.ts` must exist (P0.3).

**Changes:**

1. **Lift `mobileOpen` state from `Sidebar.tsx` to `DashboardLayout`** — `mobileOpen` is currently local to Sidebar and not accessible at the layout level. Pass it via props or context.

2. Add `inert={mobileOpen ? '' : undefined}` to `<main id="main-content">`:
   ```tsx
   // After module augmentation, this compiles cleanly
   <main id="main-content" inert={mobileOpen ? '' : undefined}>
   ```
   > **Agent automation note:** `inert` makes all `<main>` descendants unreachable to Playwright. All automated tests and agent sessions must use `viewport: { width: 1280, height: 720 }` to prevent `mobileOpen` from becoming `true`. Document in `playwright.config.ts`.

3. Add `role="dialog"` and `aria-modal="true"` to the mobile `<aside>` when open.

4. **Add focus restoration on sidebar close:** When `mobileOpen` transitions from `true` to `false`, restore focus to the hamburger button that opened it. Track the trigger with a `useRef`.

5. Verify the modal portal root (`fixed inset-0 z-60` overlay) is rendered **outside** `<main>` in the DOM tree — otherwise it will also become `inert` when the sidebar opens.

#### C3. MedicineAutocomplete — Full ARIA Combobox Pattern

**WCAG:** 4.1.2 Name, Role, Value

**File:** `frontend/src/components/pharmacy/MedicineAutocomplete.tsx`

Model after `CommandPalette.tsx`. Add `dropdownRef` (currently missing from the component). Add `activeIndex` state.

1. **Input markup:**
   ```tsx
   <input
     role="combobox"
     aria-expanded={open}
     aria-controls="medicine-listbox"
     // undefined (not "") when nothing is active — empty string is invalid IDREF
     aria-activedescendant={activeIndex >= 0 ? `medicine-option-${activeIndex}` : undefined}
     aria-autocomplete="list"
     aria-haspopup="listbox"
     ...
   />
   ```

2. **Dropdown container:**
   ```tsx
   <div id="medicine-listbox" role="listbox" aria-label="Medicine suggestions" ref={dropdownRef}>
   ```

3. **Each option (add `lang="ta"` for Tamil names):**
   ```tsx
   <div
     id={`medicine-option-${index}`}
     role="option"
     aria-selected={activeIndex === index}
     ...
   >
     <span>{medicine.name}</span>
     {medicine.name_ta && <span lang="ta">{medicine.name_ta}</span>}
   </div>
   ```

4. **Keyboard navigation** — add `onKeyDown` to input:
   - `ArrowDown` → `setActiveIndex(i => Math.min(i + 1, medicines.length - 1))`; `setOpen(true)`
   - `ArrowUp` → `setActiveIndex(i => Math.max(i - 1, -1))`
   - `Enter` (when `activeIndex >= 0`) → select `medicines[activeIndex]`, close, `setActiveIndex(-1)`
   - `Escape` → close dropdown, `setActiveIndex(-1)`

5. **`scrollIntoView` (mandatory per APG)** — add a `useEffect`:
   ```tsx
   useEffect(() => {
     if (activeIndex < 0 || !dropdownRef.current) return;
     const activeEl = dropdownRef.current.querySelector(
       `#medicine-option-${activeIndex}`
     ) as HTMLElement | null;
     activeEl?.scrollIntoView({ block: 'nearest' });
   }, [activeIndex]);
   ```

6. **Fix blur race** — replace `onBlur={setTimeout(...)}` with `relatedTarget` check:
   ```tsx
   onBlur={(e) => {
     // relatedTarget is null in Firefox when clicking non-focusable elements —
     // the onMouseDown e.preventDefault() on option buttons handles the main case
     if (!e.relatedTarget || !dropdownRef.current?.contains(e.relatedTarget as Node)) {
       setOpen(false);
       setActiveIndex(-1);
     }
   }}
   ```
   > **Agent automation:** This fix also resolves active Playwright flakiness in the prescription builder flow where the dropdown closed before click events registered.

#### C4. Settings Page — Full ARIA Tab Pattern

**WCAG:** 4.1.2 Name, Role, Value

**File:** `frontend/src/app/(dashboard)/settings/page.tsx` line 771–787

> **Correction:** The actual `Tab` type is `'profile' | 'clinic' | 'usage' | 'portability'` (4 tabs). The original plan incorrectly included `'security'` and omitted `'usage'` and `'portability'`.

**Changes:**

1. Add `tabRefs` array for programmatic focus management:
   ```tsx
   const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement>>>({});
   ```

2. Wrap tab buttons in `<div role="tablist" aria-label="Settings sections">`.

3. Each tab button (visible tabs only — filtered by `user.is_clinic_owner`):
   ```tsx
   <button
     ref={(el) => { if (el) tabRefs.current[tab.id] = el; }}
     role="tab"
     id={`tab-${tab.id}`}
     aria-selected={activeTab === tab.id}
     aria-controls={`tabpanel-${tab.id}`}
     tabIndex={activeTab === tab.id ? 0 : -1}
     onClick={() => setActiveTab(tab.id)}
     onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
   >
   ```

4. Arrow key navigation — operate on the **visible** tab set only:
   ```tsx
   const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: Tab) => {
     // Only navigate within visible tabs
     const visibleTabs = tabs.filter(t => t.show).map(t => t.id);
     const idx = visibleTabs.indexOf(currentTab);
     let nextTab: Tab | undefined;
     if (e.key === 'ArrowRight') nextTab = visibleTabs[(idx + 1) % visibleTabs.length];
     else if (e.key === 'ArrowLeft') nextTab = visibleTabs[(idx - 1 + visibleTabs.length) % visibleTabs.length];
     else if (e.key === 'Home') nextTab = visibleTabs[0];
     else if (e.key === 'End') nextTab = visibleTabs[visibleTabs.length - 1];
     if (!nextTab) return;
     e.preventDefault();
     setActiveTab(nextTab);
     // Safe: tab buttons are always in the DOM (only className changes on activation)
     // React 18 state update does not need flushSync here
     tabRefs.current[nextTab]?.focus();
   };
   ```

5. Each content panel. **`UsageDashboard` must stay conditionally rendered** (it fetches data on mount — always-rendering it fires API calls on settings page load):
   ```tsx
   {/* Profile, Clinic, DataPortability — switch to hidden (no data fetching) */}
   <div
     role="tabpanel"
     id={`tabpanel-profile`}
     aria-labelledby="tab-profile"
     tabIndex={0}
     hidden={activeTab !== 'profile'}
   >
     <ProfileSection ... />
   </div>

   {/* UsageDashboard — keep conditional render (fetches data on mount) */}
   {activeTab === 'usage' && (
     <div role="tabpanel" id="tabpanel-usage" aria-labelledby="tab-usage" tabIndex={0}>
       <UsageDashboard ... />
     </div>
   )}
   ```

---

## Acceptance Criteria

### Functional Requirements

- [ ] All text/background combinations using `--color-text-secondary`, `--color-text-muted`, and `placeholder:text-gray-*` achieve ≥ 7:1 contrast ratio against their respective surface colors
- [ ] Skip link appears visually when focused (Tab from top of page) and moves focus to `<main id="main-content">`
- [ ] `@media (prefers-reduced-motion: reduce)` suppresses all keyframe animations in `globals.css`
- [ ] `<Spinner>` primitive renders with `role="status"` and `aria-label`; `motion-safe:animate-spin` is used
- [ ] All decorative Lucide icons alongside text have `aria-hidden="true"`; informative icons have descriptive `aria-label`
- [ ] All form inputs use `focus-visible:ring-2 ring-offset-2`; no element has `focus:outline-none` without a visible focus ring
- [ ] All `<th>` in PatientTable, ConsultationsTable, MedicineCatalogTable have `scope="col"`; tables have `aria-label`
- [ ] Patient table rows, consultation table rows, and medicine catalog rows are keyboard-reachable (Tab + Enter/Space activates)
- [ ] `login/page.tsx` error container pre-renders with `role="alert"`; inputs have `aria-invalid` and `aria-describedby`; OTP step transition has `aria-live="polite"` announcement; resend button has 60s cooldown
- [ ] `FormSection` collapsible panel uses `useId()` for panel ID; button has `aria-controls`; sections without required fields use `hidden={!isOpen}`; sections with required fields keep conditional rendering
- [ ] Settings success spans have `role="status"` and `aria-live="polite"` pre-rendered containers
- [ ] Hidden file inputs have `aria-label`
- [ ] Tamil text fields are wrapped in `<span lang="ta">` including in MedicineAutocomplete options
- [ ] `Modal.tsx` uses native `<dialog>` element (or `useFocusTrap` hook if native `<dialog>` is not viable)
- [ ] Mobile sidebar: `mobileOpen` lifted to layout; `<main>` has `inert` when drawer is open; focus restores to hamburger button on close
- [ ] `MedicineAutocomplete` has full ARIA combobox pattern; Arrow keys navigate options with `scrollIntoView`; `onBlur` uses `relatedTarget`; `aria-activedescendant` is `undefined` (not `""`) when nothing is active
- [ ] Settings page tabs have `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`; Arrow keys navigate visible tabs; `UsageDashboard` tab stays conditionally rendered
- [ ] `Button` with `isLoading={true}` has `aria-busy="true"` on the `<button>` and spinner has `aria-hidden="true"`
- [ ] `src/types/react-augment.d.ts` exists with `inert` module augmentation
- [ ] `@axe-core/playwright` tests at `tests/a11y/` pass with zero violations on `/login`, `/`, `/patients`, `/pharmacy`, `/settings`

### Non-Functional Requirements

- [ ] No TypeScript errors introduced
- [ ] No visual regressions to existing UI
- [ ] All automated tests (playwright a11y suite) run at `1280x720` viewport
- [ ] OTP resend shows countdown timer and is disabled during cooldown

---

## Success Metrics

- All 13 original WCAG violations resolved
- All 5 SpecFlow gaps resolved (clickable rows, mobile sidebar, FormSection always-render, Tamil lang, Button aria-busy)
- Zero axe-core violations measured by `@axe-core/playwright` on 6 routes
- MedicineAutocomplete blur race resolved (Playwright flakiness eliminated)

---

## Dependencies & Risks

| Risk | Mitigation |
|---|---|
| Darkened color tokens may feel jarring | Verify both `#3d4d3f` and `#555f57` against Ruthva design direction; adjust to nearest AAA value |
| `inert` breaks Playwright at mobile viewport | Set all playwright tests to `1280x720`; document viewport constraint |
| `FormSection hidden` + required fields block submit | Only apply `hidden` to sections without required inputs; keep conditional render for Change Password |
| `MedicineAutocomplete` rewrite breaks prescription builder | Test against `PrescriptionBuilder.tsx` which embeds `MedicineAutocomplete`; verify select, edit, clear, keyboard flows |
| Settings tab `hidden` panels — CSS animations broken | Verify Profile, Clinic, DataPortability sections render correctly after `hidden` toggle |
| `/pharmacy/{id}` route 404 | Fix the missing route or change MedicineCatalogTable row action before implementing B3 |
| `mobileOpen` state lift breaks Sidebar's internal close logic | Pass `onClose` callback from layout to Sidebar; test mobile drawer open/close cycle |
| Native `<dialog>` animation changes | CSS `dialog[open]` animation approach replaces the old `animate-[fadeIn]` class |
| OTP resend cooldown UX | Display countdown timer in button label; re-enable after cooldown without page refresh |

---

## Security Findings (from Research)

These are pre-existing issues surfaced during the accessibility review. They should be addressed alongside the a11y plan:

1. **Missing HTTP security headers in `next.config.mjs`** (High) — No `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, or `X-Frame-Options`. This makes the server-controlled error text in `aria-live` regions exploitable via MITM. Add a `headers()` export to `next.config.mjs`.

2. **No rate limiting on OTP resend** (Medium) — Addressed in B4 with client-side cooldown. Also add Django Ratelimit / DRF throttling on `/auth/request-otp/` backend endpoint.

3. **Server-controlled error text in `aria-live` regions** (Low) — Cap at 200 characters before rendering. React JSX prevents XSS; the risk is social engineering via screen reader announcements if API is compromised.

---

## References & Research

### Internal References — Gold Standard Patterns

- ARIA combobox reference: `frontend/src/components/layout/CommandPalette.tsx:196–233`
- Form error ARIA reference: `frontend/src/components/forms/FormField.tsx`
- Dialog/modal reference: `frontend/src/components/ui/Modal.tsx` (being migrated to `<dialog>`)
- Color tokens: `frontend/src/app/globals.css:7–33`
- Dashboard layout entry point: `frontend/src/app/(dashboard)/layout.tsx`

### External References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA APG — Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [ARIA APG — Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [ARIA APG — Dialog Modal Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN — `role="alert"` (implies aria-live="assertive" + aria-atomic="true")](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role)
- [MDN — `hidden` attribute (does NOT exclude from form submission)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden)
- [Tailwind v3 — `sr-only` / `motion-safe:` utilities](https://v3.tailwindcss.com/docs/screen-readers)
- [axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)

### Related Work

- Previous PR: `feat: add OTP-based login, Ruthva branding, and clinic identity` (commit `0e3a310`) — login page created without ARIA error patterns
- Phase 2 security review: `docs/solutions/security-issues/phase2-team-management-security-review.md` — Finding #010 identified modal ARIA gap
- Agent-native note: `MedicineCatalogTable.tsx:98` router.push to non-existent `/pharmacy/{id}` route — fix before B3
