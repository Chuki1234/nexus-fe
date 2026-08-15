---
name: taste-skill
description: Anti-slop frontend skill for crafting high-quality, distinctive web interfaces with disciplined layout, typography, motion, density, and color calibration.
license: MIT (Leonxlnx / taste-skill)
---

# Taste Skill — Anti-Slop Frontend Design Guide

> Source: https://github.com/Leonxlnx/taste-skill (Author: Leonxlnx)
> Purpose: Project-local reference for anti-slop frontend design, typography discipline, layout variety, and refined interaction feedback.

---

## 0. BRIEF INFERENCE (Read the Room Before Anything Else)

Before touching code or tweaking dials, **infer what the user actually wants**. Most LLM design output is bad because the model jumps to a default aesthetic instead of reading the room.

### 0.A Read these signals first
1. **Page kind** - landing (SaaS / consumer / agency / event), portfolio, dashboard/product UI, redesign (preserve vs overhaul), editorial / blog.
2. **Vibe words** - "minimalist", "calm", "Linear-style", "Awwwards", "brutalist", "premium consumer", "Apple-y", "playful", "serious B2B", "editorial", "dark tech".
3. **Reference signals** - URLs linked, screenshots, products named, brands competing with.
4. **Audience** - B2B procurement panel vs. design-conscious consumer vs. recruiter vs. community chat members. The audience picks the aesthetic, not personal taste.
5. **Brand assets that already exist** - logo, color palette, design system tokens, typography. For redesigns or established projects, these are starting material, not optional input.
6. **Quiet constraints** - accessibility-first audiences, public-sector, regulated industries, trust-first commerce. These constraints OVERRIDE aesthetic preference.

### 0.B Output a one-line "Design Read" before generating
State in one line: **"Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <design system or aesthetic family>."**

### 0.C Anti-Default Discipline
Do not default to: AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism on everything, infinite-loop micro-animations everywhere, Inter + slate-900. Reach past them deliberately based on the project's established design system.

---

## 1. THE THREE DIALS (Core Configuration)

* **`DESIGN_VARIANCE: 8`** — 1 = Perfect Symmetry, 10 = Artsy Chaos
* **`MOTION_INTENSITY: 6`** — 1 = Static, 10 = Cinematic / Physics
* **`VISUAL_DENSITY: 4`** — 1 = Art Gallery / Airy, 10 = Cockpit / Packed Data

**Baseline:** `8 / 6 / 4`. Adjust based on context (e.g. Dashboard/Product UI typically needs higher density 5-7, moderate variance 4-6, restrained motion 3-5).

---

## 2. DESIGN ENGINEERING DIRECTIVES (Bias Correction)

### 2.1 Typography
- Establish a clear type scale with intentional weights, widths, and spacing.
- Display/Headlines: distinct hierarchy, controlled letter-spacing.
- Body/Paragraphs: readable leading (`leading-relaxed`), comfortable reading length (`max-w-[65ch]`).
- Italic descender clearance: add bottom reserve so descenders (`g, j, p, q, y`) never clip.
- Avoid mixing random font families for one-off word emphasis; use weight/italic of the same family.

### 2.2 Color Calibration & Consistency Lock
- Keep 1 primary accent for live/active states.
- Neutral bases (deep teals, warm creams, slates) with intentional, meaningful accents.
- Color Consistency Lock: Once an accent palette is chosen for an interface/view, use it consistently throughout. Do not introduce ad-hoc neon or competing accents.

### 2.3 Layout & Structural Discipline
- Structure is information: dividers, hairlines, and numbering should reflect true data structures, not purely decorative fillers.
- Avoid repetitive card-soup: group related items using negative space, hairlines, or list dividers rather than boxing everything in identical cards.
- Mobile collapse must be explicitly considered per section/drawer.

### 2.4 Interactive States & Tactile Feedback
- **Loading:** skeleton loaders matching the layout's actual shape instead of generic spinners.
- **Empty States:** structured, informative, explaining what belongs here and how to activate it.
- **Hover/Active:** clear, tactile feedback (slight elevation shift, subtle border highlight, scale feedback).
- **Accessibility:** strict WCAG AA contrast for text on buttons, inputs, tags, and surface backgrounds.

### 2.5 Copy & Content Discipline
- Write crisp, concise UI copy. Avoid LLM filler phrases or awkward wordplay.
- Real/meaningful labels over placeholder abstractions.
