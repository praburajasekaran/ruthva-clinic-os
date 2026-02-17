# Clinical UI Enhancements Design

**Date:** 2026-02-17
**Status:** Approved

## Decision

Upgrade existing frontend components to implement the remaining Phase 1 clinical UI best practices from `docs/research/clinical-ui-best-practices.md`. This is an enhancement pass on existing working code, not a rewrite.

## Context

The project already has a solid foundation: consultation forms with scroll spy, Envagai Thervu with constrained select inputs, prescription builder with medication cards, print views, auto-save, and accessible form fields. Seven of 14 Phase 1 recommendations are fully implemented. This design covers the remaining seven gaps plus three polish items.

## What's Being Built

### New Components

1. **BilingualLabel** (`components/ui/BilingualLabel.tsx`) — Reusable label showing English (primary) + Tamil (secondary) text. Used across all clinical form fields.

2. **DoshaChip** (`components/ui/DoshaChip.tsx`) — Color-coded chip for Vatham (slate/Wind), Pitham (orange/Flame), Kapham (teal/Droplet) with Lucide icon + text label.

### New Constants

3. **Bilingual labels** (`lib/constants/bilingual-labels.ts`) — Tamil translations for all form section headers, field labels, and print output headers.

4. **Timing options** — Added to `lib/constants/envagai-options.ts`: Before food/After food/With food/Empty stomach with Tamil translations.

### Component Upgrades

5. **EnvagaiThervu** — Add BilingualLabel to each tool's field labels. Show DoshaChip when Nadi dosha type is selected.

6. **ConsultationForm** — Add Tamil text to SECTIONS array. Apply BilingualLabel to section headers via FormSection.

7. **MedicationRow** — Add timing dropdown (Before food/After food/With food/Empty stomach). Apply BilingualLabel to field labels.

8. **PrescriptionBuilder** — Add BilingualLabel to section headers (Medications/Procedures/Advice/Follow-up).

9. **PatientTable** — Detect digit-first search input and show "Searching by phone..." hint.

10. **Print prescription page** — Add bilingual section headers. Add paper size toggle (A4/A5). Extract print styles to globals.css.

### Accessibility & Touch Targets

11. **Touch target audit** — Ensure all interactive elements (buttons, checkboxes, radios, select dropdowns) have min-h-[44px] min-w-[44px].

12. **Accessibility hardening** — Add `aria-live="polite"` regions for dynamic content (medication add/remove, auto-save status, search results count). Ensure consistent focus-visible ring on all inputs. Add `role="alert"` on all error messages (already in FormField, verify everywhere).

### Print Stylesheet

13. **Global print styles** — Extract inline print CSS from the print page to `globals.css` @media print block covering: hide nav/sidebar, page setup, typography, color forcing, break rules.

## Color System

Follow existing conventions:

| Element | Color |
|---------|-------|
| Vatham dosha chip | `bg-slate-100 text-slate-700` + Wind icon |
| Pitham dosha chip | `bg-orange-100 text-orange-700` + Flame icon |
| Kapham dosha chip | `bg-teal-100 text-teal-700` + Droplet icon |
| Tamil text | `font-tamil text-xs text-gray-500` |
| All other colors | Existing emerald/amber/red/gray scheme unchanged |

## Patterns to Follow

- Named exports, no default exports
- `"use client"` on interactive components
- `type XxxProps = { ... }` above component
- Primitive UI: `forwardRef` + `displayName`, accept `className`
- Wrap all inputs in `<FormField>` for accessibility
- Lucide React icons only
- `font-tamil` class for Tamil text
- Constants in `lib/constants/`

## What's NOT Changing

- No new pages or routes
- No backend model changes (timing can be stored in existing `instructions` text field)
- No state management changes (useReducer stays)
- No navigation changes
- No new hooks needed
- No dependency additions

## Risks

- **Tamil text overflow**: Tamil script renders wider than Latin at the same font size. Mitigated by using `text-xs` and testing.
- **Print regression**: Changing print CSS could break existing A5 layout. Mitigated by keeping A5 as default, adding A4 as opt-in.
