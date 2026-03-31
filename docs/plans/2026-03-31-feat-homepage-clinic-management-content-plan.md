---
title: "feat: Rewrite Homepage Content for Clinic Management System"
type: feat
status: completed
date: 2026-03-31
---

# Rewrite Homepage Content for Clinic Management System

## Overview

Reposition the Ruthva Clinic OS homepage from a "Patient Continuity / WhatsApp engagement" product to a **complete multi-discipline AYUSH clinic management platform**. Every section of the landing page currently references WhatsApp-based patient recovery workflows. This plan replaces all that messaging with content showcasing the actual clinic OS features: patient management, consultations, prescriptions, pharmacy, team management, and multi-discipline AYUSH support.

## Problem Statement

The current homepage markets a WhatsApp-based patient retention product that doesn't reflect what Ruthva Clinic OS actually is. The product is a full clinic management system with EMR, prescriptions, pharmacy, team management, and specialty-specific workflows for Siddha, Ayurveda, Homeopathy, Yoga & Naturopathy, and Unani. Visitors land on the page expecting a WhatsApp bot, not a clinic OS. This misalignment hurts conversions and sets wrong expectations.

**Specific WhatsApp references to remove:**

| File | Line(s) | Current Content |
|------|---------|-----------------|
| `Hero.tsx` | ~37 | "engages them via WhatsApp before they drop out" |
| `Hero.tsx` | ~57 | Trust badge: "WhatsApp Integration" |
| `ProblemSolution.tsx` | ~79 | "WhatsApp check-ins sent automatically" |
| `OnboardingSimulation.tsx` | ~274-306 | Mock WhatsApp conversation UI (entire Step 3) |
| `Pricing.tsx` | ~66 | "WhatsApp Messaging Included" feature line |

## Proposed Solution

Rewrite all 6 landing page components to position Ruthva as **"The clinic OS built for AYUSH practitioners"** — combining multi-discipline support with a complete practice management suite.

### New Messaging Direction

- **Tagline**: "The clinic OS built for AYUSH practitioners"
- **Value prop**: One platform for patients, consultations, prescriptions, pharmacy, and your team — with built-in support for Siddha, Ayurveda, Homeopathy, and more.
- **Key differentiator**: Discipline-specific workflows (Envagai Thervu, Prakriti Assessment, Homeopathy case taking) that generic EMRs don't offer.

## Technical Approach

### Architecture

No structural changes to the component tree. All changes are **content-only** within existing components:

```
frontend/src/app/page.tsx          (no changes — just renders components)
├── components/landing/Navbar.tsx   (minor copy tweaks if needed)
├── components/landing/Hero.tsx     (full content rewrite)
├── components/landing/ProblemSolution.tsx  (full content rewrite)
├── components/landing/OnboardingSimulation.tsx  (Step 3 replacement + copy updates)
├── components/landing/Pricing.tsx  (redesign features + pricing tiers)
└── components/landing/Footer.tsx   (minimal or no changes)
```

**Tech stack stays the same:** Next.js 14, Tailwind CSS, Framer Motion animations, Lucide React icons, Google Sans font, warm green/cream design tokens.

### Implementation Phases

#### Phase 1: Hero Section Rewrite

**File:** `frontend/src/components/landing/Hero.tsx`

**Current → New:**

| Element | Current | New |
|---------|---------|-----|
| Badge | "Built exclusively for AYUSH Clinics" | Keep as-is (already correct) |
| Headline | "Detect disappearing patients and bring them back." | "Your entire AYUSH practice. One powerful platform." |
| Subheadline | "The Patient Continuity System that tracks treatment adherence automatically, finds at-risk patients, and engages them via WhatsApp before they drop out." | "Manage patients, consultations, prescriptions, pharmacy, and your team — with built-in support for Siddha, Ayurveda, Homeopathy, Yoga & Naturopathy, and Unani." |
| Trust Badge 1 | "WhatsApp Integration" | "Multi-Discipline Support" |
| Trust Badge 2 | "Zero Software to Learn" | "Digital Prescriptions" |
| Trust Badge 3 | "Runs on Autopilot" | "Team Collaboration" |
| CTAs | "Register Your Clinic" + "See how it works" | Keep as-is |
| Hero Image | `Ruthva-hero-image.png` (adherence flow diagram) | Replace with a dashboard screenshot or mockup showing the clinic OS interface |

**Tasks:**
- [ ] Rewrite headline, subheadline, and trust badges in `Hero.tsx`
- [ ] Update trust badge icons (use Lucide React: `Stethoscope`, `FileText`, `Users`)
- [ ] Replace or update hero image to show clinic dashboard (check `/public/` for existing assets, or create a screenshot)

**Success criteria:** Hero communicates "clinic management platform" within 5 seconds of viewing.

---

#### Phase 2: ProblemSolution Section Rewrite

**File:** `frontend/src/components/landing/ProblemSolution.tsx`

**Current:** "The Notebook Way" vs "The Ruthva Way" comparing manual patient tracking with WhatsApp-based automation.

**New:** "The Old Way" vs "The Ruthva Way" comparing paper/spreadsheet clinic management with a unified digital platform.

| Side | Current Pain Points | New Pain Points |
|------|-------------------|----------------|
| Old Way | Manual tracking, scanning pages, mental calculations, hoping someone calls | Paper prescriptions lost, patient history in scattered notebooks, no team coordination, manual follow-up scheduling |
| Ruthva Way | Continuous risk detection, automatic WhatsApp check-ins, patient quick replies, at-risk dashboard | Digital patient records, one-click prescriptions with print, consultation history at a glance, team dashboard with roles |

**Tasks:**
- [ ] Rewrite all pain point items (left column: old way)
- [ ] Rewrite all benefit items (right column: Ruthva way)
- [ ] Update any icons to reflect clinic management (use Lucide React)
- [ ] Remove any WhatsApp-specific iconography or messaging

**Success criteria:** Section clearly contrasts paper-based clinic management with a digital clinic OS.

---

#### Phase 3: OnboardingSimulation Section Update

**File:** `frontend/src/components/landing/OnboardingSimulation.tsx`

This is an animated 3-step walkthrough. Steps 1 and 2 need copy updates; Step 3 needs a full replacement.

| Step | Current | New |
|------|---------|-----|
| Step 1 | "Add a patient (takes 20s)" — mock patient form | "Add a patient in seconds" — keep the mock form, update subtitle copy if it references continuity/adherence |
| Step 2 | "Silent Monitoring" — patient journey timeline | "Record consultations" — show a mock consultation form with discipline-specific fields |
| Step 3 | "Risk Detected & Recovered" — **mock WhatsApp conversation** | "Generate prescriptions" — show a mock prescription preview with medicine list, dosage, and print button |

**Step 3 replacement detail:**

Remove the entire WhatsApp conversation mock UI (~lines 274-306). Replace with a **prescription preview card** showing:
- Patient name and date
- Medicine list (2-3 items with dosage and duration)
- Doctor signature area
- "Print" and "Share" action buttons
- Styled to match the existing warm green/cream design system

**Tasks:**
- [ ] Update Step 1 copy (remove any adherence/continuity language)
- [ ] Redesign Step 2 to show consultation recording instead of "Silent Monitoring"
- [ ] Replace Step 3 WhatsApp mock with prescription preview mock
- [ ] Update step descriptions and animation transitions
- [ ] Ensure Framer Motion animations still work with new content

**Success criteria:** 3-step walkthrough demonstrates the core patient → consultation → prescription workflow.

---

#### Phase 4: Pricing Section Redesign

**File:** `frontend/src/components/landing/Pricing.tsx`

**Current:** Single "Starter Plan" at 999 INR/month with WhatsApp-focused features.

**New:** Redesigned pricing with updated feature list reflecting the clinic OS.

**New feature list for the plan:**
- Unlimited patient records
- Digital consultations & EMR
- Prescription generation & print
- Multi-discipline support (Siddha, Ayurveda, Homeopathy, Yoga & Naturopathy, Unani)
- Pharmacy management
- Team management (invite up to N staff)
- Dashboard & analytics
- Data export (CSV/PDF)
- Bilingual support (Tamil/English)

**Remove:**
- ~~100 active treatment journeys~~
- ~~Automated adherence checks~~
- ~~Recovery automation~~
- ~~WhatsApp Messaging Included~~

**Social proof banner:** Replace "Revenue Protected This Month: 72,000 INR" with a clinic-relevant metric like "Clinics Running on Ruthva: [N]" or "Prescriptions Generated: [N]" (or remove if no real data yet).

**Tasks:**
- [ ] Rewrite feature list items
- [ ] Update pricing tier name and description
- [ ] Replace or remove the social proof banner
- [ ] Consider adding a second tier (Free/Pro) or keep single tier — user decision at implementation time
- [ ] Update feature icons (use Lucide React)

**Success criteria:** Pricing section accurately represents what the clinic OS offers with no WhatsApp references.

---

#### Phase 5: Navbar & Footer Review

**Files:** `frontend/src/components/landing/Navbar.tsx`, `frontend/src/components/landing/Footer.tsx`

**Navbar:** Likely minimal changes. Verify:
- [ ] No WhatsApp references in nav links or CTAs
- [ ] "How It Works" anchor still points to the OnboardingSimulation section
- [ ] "Pricing" anchor still works

**Footer:** Verify:
- [ ] No WhatsApp references
- [ ] Links are correct (Doctor Login, Support email)
- [ ] Consider adding links to features or disciplines

**Tasks:**
- [ ] Audit Navbar.tsx for any WhatsApp copy
- [ ] Audit Footer.tsx for any WhatsApp copy
- [ ] Update any outdated links or descriptions

---

#### Phase 6: Asset Updates

**Hero image replacement:**
- [ ] Take a screenshot of the actual dashboard (or create a clean mockup) to replace `Ruthva-hero-image.png`
- [ ] Ensure the image shows the clinic OS interface (sidebar, patient list, or dashboard stats)
- [ ] Optimize image for web (compress, appropriate dimensions)

**Prescription mock for Step 3:**
- [ ] Design the prescription preview as a React component within OnboardingSimulation
- [ ] Use existing design tokens (warm cream background, green accents, rounded corners)
- [ ] Include realistic but fake data (Dr. Priya, patient Anitha, Siddha medicines)

## Alternative Approaches Considered

| Approach | Why Rejected |
|----------|-------------|
| Complete landing page redesign with new layout | Overkill — the current component structure and design system work well. Only content needs changing. |
| Keep WhatsApp as a secondary feature mention | User explicitly requested no WhatsApp — it's a separate product concern. Clean separation is better. |
| Build a features grid/carousel instead of 3-step walkthrough | The animated walkthrough is engaging and already works. Replacing content within it preserves the UX investment. |

## Acceptance Criteria

### Functional Requirements

- [ ] Zero mentions of "WhatsApp" anywhere on the homepage
- [ ] Zero mentions of "patient continuity", "adherence", "disappearing patients", or "recovery" in marketing context
- [ ] Hero section communicates "AYUSH clinic management platform" clearly
- [ ] ProblemSolution contrasts paper-based vs digital clinic management
- [ ] OnboardingSimulation shows patient → consultation → prescription flow
- [ ] Pricing lists actual clinic OS features
- [ ] All CTAs still link to correct pages (`/signup`, pricing anchor, how-it-works anchor)
- [ ] "Built exclusively for AYUSH Clinics" badge retained

### Non-Functional Requirements

- [ ] Page load performance unchanged (no new heavy assets without optimization)
- [ ] Framer Motion animations still functional on all steps
- [ ] Mobile responsive layout preserved
- [ ] Accessibility maintained (WCAG AA minimum — existing site targets AAA)
- [ ] Design tokens (colors, fonts, border-radius) consistent with existing system

### Quality Gates

- [ ] Visual review on desktop (1440px) and mobile (375px)
- [ ] All internal links tested (no broken anchors)
- [ ] No TypeScript errors
- [ ] Lighthouse performance score maintained (check before/after)

## Success Metrics

- **Immediate:** Homepage accurately represents the clinic management product
- **Conversion:** Registration CTA clicks should maintain or improve (tracked via analytics if set up)
- **Bounce rate:** Should decrease as messaging matches actual product
- **User feedback:** New visitors understand what Ruthva is within one page scroll

## Dependencies & Prerequisites

| Dependency | Status | Impact |
|------------|--------|--------|
| Existing design token system | Ready | Use `--color-brand-*`, `--color-surface`, etc. |
| Lucide React icons | Installed | Use for trust badges and feature icons |
| Framer Motion | Installed | Animations in OnboardingSimulation |
| Hero image replacement | Needed | Dashboard screenshot or mockup required |
| Real social proof data | Unknown | If no real clinic count, remove or use placeholder |

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hero image not available | Medium | Medium | Use a CSS-styled mockup component instead of a static image |
| Pricing redesign scope creep (adding tiers) | Medium | Low | Keep single tier for MVP; tiers can be added later |
| Copy doesn't resonate with AYUSH practitioners | Low | Medium | Use terminology from the existing app (Envagai Thervu, Prakriti, etc.) for authenticity |
| Breaking Framer Motion animations when replacing Step 3 | Low | Medium | Keep the same animation wrapper; only replace inner content |

## Resource Requirements

- **Frontend developer:** 1 person
- **Effort estimate:** Content changes only, no backend work
- **Assets needed:** 1 hero image (dashboard screenshot or mockup)

## Future Considerations

- **Feature page:** As the product grows, individual feature pages (Pharmacy, Prescriptions, Team) could be linked from the homepage
- **Testimonials:** Add a testimonials section once real clinics are onboarded
- **Demo video:** Replace the static 3-step walkthrough with an embedded product demo video
- **WhatsApp as add-on:** If WhatsApp features return as an optional integration, they can be marketed as an add-on, not the core product
- **Localization:** Homepage in Tamil/Hindi for regional AYUSH practitioners

## Documentation Plan

- Update any internal docs that reference the old homepage messaging
- If a style guide or brand guidelines doc exists, update the value proposition section
- Document the new messaging direction for consistency across other pages (signup, onboarding)

## References & Research

### Internal References

- Homepage entry: `frontend/src/app/page.tsx`
- Hero: `frontend/src/components/landing/Hero.tsx`
- ProblemSolution: `frontend/src/components/landing/ProblemSolution.tsx`
- OnboardingSimulation: `frontend/src/components/landing/OnboardingSimulation.tsx`
- Pricing: `frontend/src/components/landing/Pricing.tsx`
- Navbar: `frontend/src/components/landing/Navbar.tsx`
- Footer: `frontend/src/components/landing/Footer.tsx`
- Design tokens: `frontend/src/app/globals.css`
- Tailwind config: `frontend/tailwind.config.ts`
- Related brainstorm: `docs/brainstorms/2026-03-18-registration-and-landing-page-brainstorm.md`

### Existing App Features (source of truth for homepage content)

- Sidebar nav items: `frontend/src/components/layout/Sidebar.tsx:28-37`
- Patient management: `frontend/src/app/(dashboard)/patients/`
- Consultations: `frontend/src/app/(dashboard)/consultations/`
- Prescriptions: `frontend/src/app/(dashboard)/prescriptions/`
- Pharmacy: `frontend/src/app/(dashboard)/pharmacy/`
- Team: `frontend/src/app/(dashboard)/team/`
- Specialty features: `EnvagaiThervu.tsx`, `PrakritiForm.tsx`, `HomeopathyCaseTakingForm.tsx`
- Bilingual labels: `frontend/src/lib/bilingual-labels.ts`

### ERD

No new models. This is a frontend-only content change.
