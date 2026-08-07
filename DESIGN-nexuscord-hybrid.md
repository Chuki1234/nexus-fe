---
version: alpha
name: NexusCord-hybrid-design
description: >
  Hybrid design system kết hợp: MongoDB dark teal palette cho dark mode,
  Starbucks warm-cream palette cho light mode. Mọi thiết kế khác (typography,
  shape, component geometry, layout, elevation, responsive) theo MongoDB.
  Kết quả: một hệ thống đôi mode mà dark thì chuyên nghiệp như dashboard
  database, light thì ấm như quán café cao cấp.

# ═══════════════════════════════════════════════════════════════════════════
#  LIGHT MODE — Starbucks-inspired warm ceramic palette
#  Nguồn: DESIGN-starbucks.md — Neutral Warm cream, 4-tier green accents
# ═══════════════════════════════════════════════════════════════════════════
colors-light:
  # ── Brand & Accent ──
  primary: "#006241"              # Starbucks Green — heading, brand signal
  primary-soft: "#00754a"         # Green Accent — CTA fill
  primary-deep: "#1e3932"         # House Green — deep link, heavy anchor
  primary-pressed: "#004d33"      # Pressed state CTA
  on-primary: "#ffffff"
  brand-green: "#00754a"          # CTA pill fill (Green Accent)
  brand-green-dark: "#006241"     # Inline link color
  brand-green-soft: "#d4e9e2"     # Green Light — success surface
  gold: "#cba258"                 # Rewards-only accent — never general
  gold-light: "#dfc49d"           # Softer gold backgrounds
  gold-lightest: "#faf6ee"        # Cream-gold wash

  # ── Surface ──
  canvas: "#f2f0eb"               # Neutral Warm — napkin cream
  canvas-dark: "#1e3932"          # House Green for dark bands/code blocks
  surface: "#f7f5f0"              # Warmer than ceramic
  surface-soft: "#edebe9"         # Ceramic — section wash
  surface-feature: "#eaf5f0"      # Mint tint — featured/hover
  hairline: "#ddd8ce"             # Card border — warm cream
  hairline-soft: "#e8e3d9"        # Quiet divider
  hairline-strong: "#9e9788"      # Interactive border — WCAG 3:1+
  hairline-dark: "#2b5148"        # Border on dark surfaces

  # ── Text ──
  ink: "rgba(0, 0, 0, 0.87)"     # DESIGN-starbucks: Text Black
  charcoal: "#1e3932"             # House Green headings
  slate: "rgba(0, 0, 0, 0.68)"   # Secondary text
  steel: "rgba(0, 0, 0, 0.58)"   # Tertiary text
  stone: "rgba(0, 0, 0, 0.46)"   # Muted labels, caption
  muted: "rgba(0, 0, 0, 0.34)"   # Disabled, placeholder
  on-dark: "#ffffff"              # Text on dark bands
  on-dark-muted: "rgba(255, 255, 255, 0.70)"   # Text White Soft

  # ── Semantic ──
  danger: "#c82014"               # DESIGN-starbucks Red
  danger-surface: "#fdf0ef"
  danger-border: "#e09a95"
  success: "#00754a"
  warning-bg: "#faf6ee"           # Gold Lightest — warm warning
  warning-text: "#946f3f"

# ═══════════════════════════════════════════════════════════════════════════
#  DARK MODE — MongoDB-inspired deep-teal database palette
#  Nguồn: DESIGN-mongodb.md — Brand Teal Deep, MongoDB Green accent
# ═══════════════════════════════════════════════════════════════════════════
colors-dark:
  # ── Brand & Accent ──
  primary: "#00ed64"              # MongoDB Green — bright CTA on dark
  primary-soft: "#00b545"         # Deeper green hover
  primary-deep: "#00684a"         # Inline link on dark
  primary-pressed: "#008c34"
  on-primary: "#001e2b"           # Deep navy text on green CTA
  brand-green: "#00ed64"          # MongoDB's unmistakable green
  brand-green-dark: "#00684a"     # Secondary green
  brand-green-mid: "#00a35c"      # Mid-spectrum green
  brand-green-soft: "#c3f0d2"     # Pale-mint tint

  # ── Surface ──
  canvas: "#001e2b"               # Brand Teal Deep — page background
  canvas-dark: "#001e2b"          # Same — code blocks
  surface: "#002634"              # Subtle section bg
  surface-soft: "#082b38"         # Quieter divisions
  surface-feature: "#003d4f"      # Brand Teal — feature surfaces
  hairline: "#1c4553"             # Borders on dark
  hairline-soft: "#163540"        # Quiet divider
  hairline-strong: "#5c7883"      # Interactive border — 3:1+
  hairline-dark: "#1c2d38"        # Deepest border

  # ── Text ──
  ink: "#ffffff"                  # Primary white text
  charcoal: "#e1e5e8"            # Emphasis body
  slate: "#c1ccd3"               # Secondary text
  steel: "#8ca0ac"               # Tertiary text
  stone: "#7c8c9a"               # Muted labels
  muted: "#5c6c7a"               # Disabled
  on-dark: "#ffffff"
  on-dark-muted: "#a8b3bc"       # Reduced-opacity white

  # ── Category Accent (from MongoDB course tags) ──
  accent-purple: "#7b3ff2"
  accent-orange: "#fa6e39"
  accent-pink: "#f06bb8"
  accent-blue: "#3d4f9f"

  # ── Semantic ──
  danger: "#ff806f"
  danger-surface: "#3b201f"
  danger-border: "#8a4139"
  success: "#00ed64"
  warning-bg: "#fff8e0"
  warning-text: "#946f3f"

# ═══════════════════════════════════════════════════════════════════════════
#  TYPOGRAPHY — MongoDB Euclid Circular A system
#  (Dùng cho CẢ HAI mode)
# ═══════════════════════════════════════════════════════════════════════════
typography:
  hero-display:
    fontFamily: Euclid Circular A
    fontSize: 72px
    fontWeight: 500
    lineHeight: 1.10
    letterSpacing: -1.5px
  display-lg:
    fontFamily: Euclid Circular A
    fontSize: 56px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -1px
  heading-1:
    fontFamily: Euclid Circular A
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: -0.5px
  heading-2:
    fontFamily: Euclid Circular A
    fontSize: 36px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.5px
  heading-3:
    fontFamily: Euclid Circular A
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.30
  heading-4:
    fontFamily: Euclid Circular A
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.35
  heading-5:
    fontFamily: Euclid Circular A
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.40
  subtitle:
    fontFamily: Euclid Circular A
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.50
  body-md:
    fontFamily: Euclid Circular A
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-md-medium:
    fontFamily: Euclid Circular A
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.55
  body-sm:
    fontFamily: Euclid Circular A
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
  body-sm-medium:
    fontFamily: Euclid Circular A
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.50
  caption:
    fontFamily: Euclid Circular A
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.40
  caption-bold:
    fontFamily: Euclid Circular A
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.40
  micro:
    fontFamily: Euclid Circular A
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.40
  micro-uppercase:
    fontFamily: Euclid Circular A
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.40
    letterSpacing: 1px
  button-md:
    fontFamily: Euclid Circular A
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.30
  code-md:
    fontFamily: Source Code Pro
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55

# ═══════════════════════════════════════════════════════════════════════════
#  SHAPE — MongoDB border-radius scale
# ═══════════════════════════════════════════════════════════════════════════
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  full: 9999px        # Pill — universal for buttons and badges

# ═══════════════════════════════════════════════════════════════════════════
#  SPACING — MongoDB 4px base system
# ═══════════════════════════════════════════════════════════════════════════
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section-sm: 48px
  section: 64px
  section-lg: 96px
  hero: 120px

# ═══════════════════════════════════════════════════════════════════════════
#  COMPONENTS — MongoDB component definitions
#  Token references use {colors.*} — thay bằng colors-light hoặc colors-dark
#  tuỳ theo mode hiện tại.
# ═══════════════════════════════════════════════════════════════════════════
components:
  button-primary:
    backgroundColor: "{colors.brand-green}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "10px 22px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "10px 22px"
    border: "1px solid {colors.hairline-strong}"
  button-on-dark:
    backgroundColor: "{colors.brand-green}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "10px 22px"
  button-secondary-on-dark:
    backgroundColor: "transparent"
    textColor: "{colors.on-dark}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "10px 22px"
    border: "1px solid {colors.hairline-dark}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.brand-green-dark}"
    typography: "{typography.body-sm-medium}"
    padding: "0"
  card-base:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  card-feature:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "1px solid {colors.hairline}"
  card-feature-dark:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  card-course:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  pricing-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "1px solid {colors.hairline}"
  pricing-card-featured:
    backgroundColor: "{colors.surface-feature}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
    border: "2px solid {colors.brand-green}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.hairline-strong}"
    height: 44px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.brand-green-dark}"
  search-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.steel}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    height: 44px
    border: "1px solid {colors.hairline-strong}"
  pill-tab:
    backgroundColor: "transparent"
    textColor: "{colors.steel}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs} {spacing.md}"
    border: "1px solid {colors.hairline}"
  pill-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.full}"
    border: "1px solid {colors.ink}"
  badge-green:
    backgroundColor: "{colors.brand-green}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-green-soft:
    backgroundColor: "{colors.brand-green-soft}"
    textColor: "{colors.brand-green-dark}"
    typography: "{typography.caption-bold}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  code-block:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  comparison-table:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.hairline}"
  faq-accordion-item:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
    border: "0 0 1px {colors.hairline} solid"
  footer-region:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    padding: "{spacing.section} {spacing.xxl}"
  footer-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-dark-muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xxs} 0"
---

## Overview

**NexusCord Hybrid** — hệ thống thiết kế hai mode kết hợp:

- **Light mode**: Bảng màu Starbucks — cream ceramic canvas (`#f2f0eb`), 4-tier green system (`#006241` / `#00754a` / `#1E3932` / `#2b5148`), gold ceremony accent (`#cba258`). Ấm như quán café cao cấp.
- **Dark mode**: Bảng màu MongoDB — deep teal canvas (`#001e2b`), bright MongoDB green (`#00ed64`) CTA pills, terminal-aesthetic code surfaces. Chuyên nghiệp như database dashboard.
- **Mọi thứ khác**: Theo MongoDB — typography (Euclid Circular A), shape system (pills + 12px cards), spacing (4px base), component geometry, elevation scale, responsive breakpoints.

Hai palette bổ trợ nhau: light ấm và mềm (café feel), dark lạnh và sâu (tech feel). Toggle giữa hai mode không đổi cấu trúc component, chỉ đổi biến màu.

**Key Characteristics:**
- Light: Cream canvas (`#f2f0eb`) + Starbucks Green CTA pills (`#00754a`) + whisper-soft card shadows + gold only for special moments
- Dark: Deep teal canvas (`#001e2b`) + bright MongoDB Green CTA pills (`#00ed64`) + terminal-aesthetic dark surfaces + colored category accent tags
- Pill buttons (`{rounded.full}`) universal — cả hai mode
- 12px card radius (`{rounded.lg}`) — cả hai mode
- Euclid Circular A everywhere — geometric, confident, technical
- Source Code Pro for code blocks

## Colors

### Light Mode — Starbucks Warm Ceramic

> Lấy từ DESIGN-starbucks.md. Canvas là giấy kem ấm, xanh Starbucks cho brand signal, gold chỉ dùng cho ceremony.

#### Brand & Accent
- **Starbucks Green** (`#006241`): Brand heading, primary signal
- **Green Accent** (`#00754a`): CTA pill fill — button primary
- **House Green** (`#1e3932`): Deep link, rail anchor, footer
- **Gold** (`#cba258`): Special ceremony moments only — NEVER general accent
- **Gold Light** (`#dfc49d`): Softer gold backgrounds
- **Gold Lightest** (`#faf6ee`): Cream-gold section wash

#### Surface
- **Canvas** (`#f2f0eb`): Neutral Warm — primary page background
- **Surface** (`#f7f5f0`): Warmer section bg, sidebar
- **Surface Soft** (`#edebe9`): Ceramic — quieter section divisions
- **Surface Feature** (`#eaf5f0`): Mint tint for featured/hover states
- **Panel** (`#ffffff`): Card surface
- **Hairline** (`#ddd8ce`): Card borders — cream warmth
- **Hairline Strong** (`#9e9788`): Interactive borders — WCAG 3:1+
- **Dark bands** (`#1e3932`): House Green for hero/footer/code blocks

#### Text
- **Ink** (`rgba(0, 0, 0, 0.87)`): Primary text — NOT pure black, 87% opacity
- **Charcoal** (`#1e3932`): House Green headings
- **Slate** (`rgba(0, 0, 0, 0.68)`): Secondary body text
- **Steel** (`rgba(0, 0, 0, 0.58)`): Tertiary text
- **Stone** (`rgba(0, 0, 0, 0.46)`): Caption, muted labels
- **On Dark** (`#ffffff`): Text on dark bands
- **On Dark Muted** (`rgba(255, 255, 255, 0.70)`): Secondary text on dark bands

#### Semantic
- **Danger** (`#c82014`): Error red (from DESIGN-starbucks)
- **Success** (`#00754a`): Green Accent
- **Warning** (`#faf6ee` bg / `#946f3f` text): Gold-tinted warning

---

### Dark Mode — MongoDB Deep Teal

> Lấy từ DESIGN-mongodb.md. Canvas là deep navy-teal, MongoDB green cho CTA, category accents cho tags.

#### Brand & Accent
- **MongoDB Green** (`#00ed64`): Bright CTA pill — the hero color on dark
- **Green Dark** (`#00684a`): Inline links on dark
- **Green Mid** (`#00a35c`): Mid-spectrum for atmospheric tints
- **Green Soft** (`#c3f0d2`): Pale-mint success surfaces

#### Surface
- **Canvas** (`#001e2b`): Brand Teal Deep — immersive dark page bg
- **Surface** (`#002634`): Subtle section bg
- **Surface Soft** (`#082b38`): Quieter divisions
- **Surface Feature** (`#003d4f`): Brand Teal — elevated feature surfaces
- **Hairline** (`#1c4553`): Borders on dark
- **Hairline Strong** (`#5c7883`): Interactive borders — 3:1+

#### Text
- **Ink** (`#ffffff`): Primary white text
- **Charcoal** (`#e1e5e8`): Emphasis body
- **Slate** (`#c1ccd3`): Secondary text
- **Steel** (`#8ca0ac`): Tertiary, caption
- **Stone** (`#7c8c9a`): Muted labels
- **On Dark Muted** (`#a8b3bc`): Reduced-opacity white in footer

#### Category Accents (dark mode only)
- **Purple** (`#7b3ff2`): Database & Security tags
- **Orange** (`#fa6e39`): Search tags
- **Pink** (`#f06bb8`): Tag variant
- **Blue** (`#3d4f9f`): Atlas/cloud tags

#### Semantic
- **Danger** (`#ff806f`): Brighter red for dark bg
- **Success** (`#00ed64`): MongoDB Green
- **Warning** (`#fff8e0` bg / `#946f3f` text)

## Typography

> Theo MongoDB — Euclid Circular A cho cả hai mode.

### Font Family
- **Display & Body**: Euclid Circular A (geometric, confident). Fallbacks: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
- **Code**: Source Code Pro. Fallbacks: 'SF Mono', Menlo, Consolas, monospace.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `hero-display` | 72px | 500 | 1.10 | -1.5px | Hero headlines |
| `display-lg` | 56px | 500 | 1.15 | -1px | Major section openers |
| `heading-1` | 48px | 500 | 1.20 | -0.5px | Page-level headlines |
| `heading-2` | 36px | 500 | 1.25 | -0.5px | Subsection headlines |
| `heading-3` | 28px | 500 | 1.30 | 0 | Card titles |
| `heading-4` | 22px | 500 | 1.35 | 0 | Feature tile titles |
| `heading-5` | 18px | 600 | 1.40 | 0 | Smaller card titles |
| `subtitle` | 18px | 400 | 1.50 | 0 | Hero subtitle, lead body |
| `body-md` | 16px | 400 | 1.55 | 0 | Primary body |
| `body-sm` | 14px | 400 | 1.50 | 0 | Secondary body, tables |
| `caption-bold` | 13px | 600 | 1.40 | 0 | Badge labels |
| `micro-uppercase` | 11px | 600 | 1.40 | 1px | Eyebrows, tags |
| `button-md` | 14px | 600 | 1.30 | 0 | Pill button labels |
| `code-md` | 14px | 400 | 1.55 | 0 | Code blocks |

### Principles
- Tight hero leading (1.10) on 72px display
- Negative letter-spacing on display sizes (-1.5px to -0.5px)
- 600 weight reserved for buttons and small emphasis
- Generous body leading (1.55) for readability

## Layout

### Spacing System
- **Base unit**: 4px (8px primary increment)
- **Tokens**: `xxs` (4px) through `hero` (120px)
- **Section rhythm**: Marketing = `section-lg` (96px); content = `section` (64px)

### Grid & Container
- 1280px max-width with 32px gutters
- 3-tier card rows, 3-up content grids
- 2-column hero with atmospheric illustration

### Whitespace Philosophy
Marketing surfaces give content generous breathing room — `hero` (120px) padding for dark bands. Content surfaces tighten to `section` (64px).

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow; `hairline` border | Default cards, table rows |
| 1 (subtle) | `rgba(0, 30, 43, 0.04) 0px 1px 2px 0px` | Hover-elevated tiles |
| 2 (card) | `rgba(0, 30, 43, 0.08) 0px 4px 12px 0px` | Feature cards |
| 3 (mockup) | `rgba(0, 30, 43, 0.12) 0px 12px 24px -4px` | Code mockup over hero |
| 4 (modal) | `rgba(0, 30, 43, 0.16) 0px 16px 48px -8px` | Modals, dropdowns |

> Light mode dùng shadow nhẹ hơn (Starbucks whisper-soft). Dark mode dùng shadow đậm hơn.

### Light Mode Elevation Override
| Level | Treatment |
|---|---|
| Card | `0 0 0.5px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.18)` — whisper-soft dual-layer |
| Modal | `0 20px 56px rgba(30,57,50,0.22), 0 3px 8px rgba(0,0,0,0.10)` |

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `xs` | 4px | Category tags |
| `sm` | 6px | Type badges, code chips |
| `md` | 8px | Inputs, search-pill, code blocks |
| `lg` | 12px | Cards, pricing tiers, course tiles |
| `xl` | 16px | Larger feature panels |
| `xxl` | 24px | Featured product showcases |
| `full` | 9999px | ALL buttons, status badges — pill universal |

## Components

> Per MongoDB design system. Token `{colors.*}` auto-switch giữa `colors-light` và `colors-dark` theo mode.

### Buttons

**`button-primary`** — Green pill CTA (dominant action)
- Light: bg `#00754a`, text `#ffffff` | Dark: bg `#00ed64`, text `#001e2b`
- Typography `button-md`, padding `10px 22px`, rounded `full`
- Pressed: darker green. Disabled: `hairline` bg, `muted` text.

**`button-secondary`** — Outlined pill (secondary action)
- bg transparent, text `ink`, border `1px solid hairline-strong`
- Same typography, padding, radius as primary

**`button-on-dark`** — Green pill on dark bands (both modes use dark bands)
- bg `brand-green`, text `on-primary`

**`button-ghost`** — Quiet rectangular ghost
- bg transparent, text `ink`, rounded `md`, padding `8px 12px`

**`button-link`** — Inline text link
- text `brand-green-dark`, no background, no padding

### Cards & Containers

**`card-base`** — Standard card
- bg `canvas`, rounded `lg` (12px), padding `xl` (24px), border `1px solid hairline`

**`card-feature`** — Larger featured card
- Same as base but padding `xxl` (32px)

**`card-feature-dark`** — Card on dark hero band
- bg `canvas-dark`, text `on-dark`, rounded `lg`, padding `xxl`

**`pricing-card-featured`** — Featured pricing tier
- bg `surface-feature`, border `2px solid brand-green`, rounded `lg`

### Inputs & Forms

**`text-input`** — Standard text field
- bg `canvas`, text `ink`, border `1px solid hairline-strong`, rounded `md`, height 44px
- Focused: border `2px solid brand-green-dark`

**`search-pill`** — Search bar
- bg `surface`, text `steel`, rounded `md`, height 44px

### Tabs

**`pill-tab`** — Pill-style tab navigation
- Inactive: text `steel`, border `1px solid hairline`, rounded `full`
- Active: bg `ink`, text `on-dark`

### Badges

**`badge-green`** — Bright green badge
- bg `brand-green`, text `on-primary`, rounded `sm`

**`badge-green-soft`** — Pale-mint pill
- bg `brand-green-soft`, text `brand-green-dark`, rounded `full`

### Code

**`code-block`** — Terminal-aesthetic code container
- bg `canvas-dark`, text `on-dark`, typography `code-md`, rounded `md`

### Navigation

**Top Navigation** — Sticky bar
- Light: bg `canvas` (cream) + green CTA pill
- Dark: bg `canvas` (teal) + bright green CTA pill
- Height ~64px, bottom border `1px solid hairline`

### Footer

**`footer-region`** — Dark multi-column footer (both modes)
- bg `canvas-dark`, text `on-dark`, padding `section xxl`
- Links in `on-dark-muted`

## Do's and Don'ts

### Do
- Use `brand-green` for primary CTAs everywhere — pill shape mandatory
- Apply `rounded.full` to every button, every status badge
- Apply `rounded.lg` (12px) to cards consistently
- Use Euclid Circular A across every UI surface
- In light mode: use Starbucks warm cream (`#f2f0eb`) canvas, NEVER pure white
- In light mode: use `rgba(0,0,0,0.87)` for text, NEVER pure black
- In light mode: reserve gold (`#cba258`) for ceremony/special moments only
- In dark mode: use deep teal (`#001e2b`) canvas for immersive depth
- In dark mode: use category accent colors (purple, orange, pink, blue) ONLY for tags
- Keep code blocks on `canvas-dark` surface in BOTH modes
- Let dark bands (House Green / Brand Teal) anchor hero and footer in BOTH modes

### Don't
- Don't use pure white as light canvas — Starbucks cream is load-bearing
- Don't use bright green for body text or large surfaces
- Don't introduce gradient fills — both systems are color-block
- Don't square button corners — pill is universal in both parent systems
- Don't apply heavy shadows on documentation cards in light mode
- Don't mix fonts — Euclid Circular A everywhere, Source Code Pro for code only
- Don't use gold as general accent in light mode — it's ceremony-only (Starbucks rule)
- Don't use category accents in light mode — they're dark-mode-only tags (MongoDB rule)

## Responsive Behavior

> Theo MongoDB responsive system.

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile (small) | < 480px | Single column. Hero 36px. 1-up cards. |
| Mobile (large) | 480 – 767px | 2-up tiles. Hero 48px. |
| Tablet | 768 – 1023px | 2-column grids. Hero 56px. |
| Desktop | 1024 – 1279px | 3-tier card row. 3-up catalog. Hero 64px. |
| Wide Desktop | ≥ 1280px | Full 72px hero. |

### Touch Targets
- Pill buttons: 40–44px effective height
- Form inputs: 44px height
- Search pill (large): 56px

### Collapsing Strategy
- Top nav collapses to hamburger below 1024px
- Hero: code mockup moves below text on mobile
- Card grids: 3-up → 2-up → 1-up
- Footer: 6-column → 3-column → accordion
- Hero typography: 72px → 56px → 48px → 36px

## Iteration Guide

1. Focus on ONE component at a time
2. Reference token names — NEVER hardcode hex values
3. When switching modes, only `{colors.*}` tokens change; everything else stays
4. Default to `body-md` for body text
5. Pill buttons (`rounded.full`) always — no exceptions
6. Dark bands (hero, footer, code) use `canvas-dark` surface in BOTH modes
7. Test both light and dark after any change
8. Gold accent (light only) must be used sparingly — ceremony moments

## Known Gaps

- Euclid Circular A is proprietary — substitute: Nunito Sans, Manrope, or Trebuchet MS
- Source Code Pro available on Google Fonts
- Animation/transition timings: recommend 150–200ms ease (not captured in source)
- Form validation states partially documented
- Light mode gold ceremony patterns need specific UI rules per context
