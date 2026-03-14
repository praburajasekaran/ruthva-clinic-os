# Ruthva -- UI Art Direction

**Date:** 2026-03-13
**Scope:** Visual direction for evolving the current frontend into a calmer, more premium, Ruthva-first product experience
**Related docs:**
- `docs/analysis/2026-03-13-ruthva-major-user-journeys.md`
- `docs/analysis/2026-03-13-ruthva-unified-information-architecture.md`
- `docs/analysis/2026-03-13-ruthva-screen-ownership-map.md`
- `docs/analysis/2026-03-13-ruthva-unified-ux-implementation-spec.md`

---

## Design Thesis

Ruthva should look like a **treatment command center** for AYUSH clinics.

It should feel:
- calm
- clinical
- premium
- trustworthy
- operational

It should not feel like:
- a generic Tailwind admin app
- a hospital ERP
- a colorful multi-module dashboard

The visual system should support the product story:

> Ruthva is where treatment continuity is monitored, risk is surfaced early, and action happens with clarity.

---

## Brand Personality

### The product should feel like:
- a confident clinical workspace
- a high-trust operations system
- a product with quiet authority
- a thoughtful AYUSH-native workflow tool

### The product should not feel like:
- a startup dashboard template
- a utility spreadsheet with icons
- a consumer wellness app
- a noisy enterprise suite

---

## Visual Tone

### Primary tone
- restrained
- warm-neutral
- precise
- intentional

### Secondary tone
- human enough for patient care
- serious enough for doctor trust

This means:
- softer surfaces
- richer neutrals
- more deliberate typography
- less color noise

---

## Color Direction

Use a restrained palette anchored in one strong Ruthva brand family.

### Recommended palette structure

#### Brand
- `Brand 950`: deep forest green for hero surfaces and high-emphasis contexts
- `Brand 900`: dark herbal green for headers and strong identity moments
- `Brand 700`: main interactive/action green
- `Brand 500`: active states and lighter highlights
- `Brand 100`: subtle tinted backgrounds

#### Neutrals
- warm white for default surfaces
- stone-tinted off-white for secondary surfaces
- soft warm gray for borders
- charcoal for primary text
- muted slate-warm gray for metadata

#### Status accents
- `Success / On Track`: soft green
- `Watch`: warm amber
- `At Risk`: deeper amber / rust
- `Critical`: terracotta red
- `Completed / Inactive`: cool muted neutral

### Color rules
- Do not let blue, purple, emerald, amber, and gray all compete equally
- Reserve amber and red strictly for attention, risk, and warning
- Use one dominant brand family for primary actions and identity
- Reduce decorative color usage in generic tables and cards

---

## Typography Direction

The typography should feel more deliberate than a default SaaS UI.

### Requirements
- strong, confident page titles
- quieter metadata
- readable dense clinical content
- clear visual distinction between:
  - title
  - section heading
  - label
  - helper text

### Usage guidance
- Page titles should feel meaningfully larger and more anchored
- Section headings should feel purposeful, not incidental
- Labels should be quieter and tighter
- Helper text should support, not compete

### Overall goal
- reduce visual chatter
- improve scan hierarchy
- make the app feel authored

---

## Layout Principles

Every major screen should use a 3-zone composition:

### 1. Context header
- page title
- one-sentence context
- one primary action
- up to two secondary actions

### 2. Primary work zone
- the main list, operational panel, or working surface
- should visually dominate the screen

### 3. Supporting context zone
- history
- metadata
- related records
- secondary information

### Layout rule
- not every section should get the same container treatment
- the primary work zone should feel visually distinct from the rest

---

## Component Direction

## 1. Cards

### Current issue
The product relies too heavily on same-weight bordered white cards.

### Direction
Create a small card hierarchy:

- **Primary operational card**
  - stronger presence
  - richer surface
  - used for key journey and attention blocks
- **Secondary context card**
  - softer
  - used for related information
- **Alert / risk card**
  - tinted by status
  - used sparingly
- **Quiet data card**
  - minimal emphasis
  - used for metrics and secondary summaries

### Rule
- do not use the same card style for every part of every page

---

## 2. Buttons

### Recommended hierarchy
- **Primary**: filled Ruthva brand button
- **Secondary**: neutral outline or soft-tint button
- **Ghost / Tertiary**: minimal text-first action
- **Danger**: destructive only

### Rules
- one primary button per screen or section
- avoid clusters of four equivalent buttons
- make the next step unmistakable

---

## 3. Status Badges

Status needs a tighter system.

### Badge system
- consistent corner radius
- consistent vertical rhythm
- consistent icon/no-icon rules
- semantic color mapping that does not change screen by screen

### Suggested states
- On Track
- Watch
- At Risk
- Critical
- Completed
- Draft / Inactive

### Rule
- the same status should look the same everywhere

---

## 4. Lists and Rows

### Current issue
The app leans heavily on raw tables, especially in operational areas.

### Direction
Move operational lists toward richer rows or cards that answer:
- who is this
- what is happening
- why does this matter
- what should I do next

### Good candidates
- journeys list
- patient list
- recent activity on Home

Tables can still be used where appropriate, but they should not define the visual language of the product.

---

## 5. Timeline

The timeline is an opportunity to create a signature Ruthva interaction.

### Direction
- stronger event hierarchy
- calmer icon system
- better spacing between events
- subtle connectors
- clearer date and status grouping

### Goal
Make treatment progression feel visible and reliable.

---

## Screen-Specific Art Direction

## Home

### Desired feeling
- morning brief
- attention dashboard
- operational calm

### Should emphasize
- who needs attention now
- what is at risk
- what is due today

### Should avoid
- generic metric tiles dominating the experience

---

## Journeys

### Desired feeling
- triage board
- treatment continuity control center

### Should emphasize
- urgency
- reason
- next step

### Should avoid
- too many inline forms in the first scroll context
- dense admin-table aesthetics

---

## Patient Detail

### Desired feeling
- care workspace
- patient story and current state

### Should emphasize
- active journey snapshot
- next step
- care continuity

### Should avoid
- burying continuity below static demographics

---

## Visit Detail

### Desired feeling
- structured clinical note
- decision point

### Should emphasize
- diagnosis
- core findings
- obvious transition to prescription

---

## Prescription Detail

### Desired feeling
- treatment instruction sheet
- calm and readable

### Should emphasize
- what was prescribed
- what happens next

### Should avoid
- presenting plan and journey controls as equal competing concepts

---

## Treatment Plan Detail

### Desired feeling
- procedural
- structured
- clearly sequenced

### Should emphasize
- schedule
- blocks
- future editable work

### Should avoid
- acting like the continuity dashboard

---

## Team / Settings

### Desired feeling
- useful
- quieter
- less branded than primary care surfaces

These pages should remain clean but should not set the visual identity of the product.

---

## Motion and Interaction

Use motion lightly.

### Appropriate motion
- subtle section fades
- restrained hover elevation
- smooth state transitions for tabs and chips
- calm loading skeletons

### Avoid
- bouncy or playful motion
- excessive microinteractions
- flashy animation that competes with clinical seriousness

---

## What to Avoid

- default Tailwind SaaS look
- too many equal-weight containers
- too many tiny labels competing with content
- decorative color use without semantic purpose
- overcrowded button groups
- a dashboard made mostly of generic KPI tiles

---

## Ruthva Look in One Sentence

Ruthva should feel like a calm clinical operating surface where treatment risk becomes visible early and the next action is always clear.

---

## Implementation Implication

This art direction should influence:
- color tokens
- typography scale
- container hierarchy
- button hierarchy
- badge system
- page layout recipes

Those should be applied after the IA and CTA hierarchy are stabilized, not before.
