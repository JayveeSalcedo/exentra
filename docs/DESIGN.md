# Design System

This document describes Exentra's visual design language: colors, typography, and the overall look-and-feel rules that keep the app consistent across pages, games, and visualizers.

Source of truth: `src/index.css` (CSS custom properties) — every value below is pulled directly from there. If a color changes in code, update it here too.

---

## 1. Design Direction

Exentra reads as a **dark, sci-fi / "mission control" learning platform** by default — deep navy/near-black backgrounds, a blue→teal accent pairing, and a monospace font for anything numeric or code-like (XP counts, timers, stats, code editors). This fits the gamified, data-structures/algorithms subject matter (think: terminal, HUD, leaderboard).

A **light mode** exists as a full alternate palette — not just an inverted dark theme. It swaps the sci-fi navy/cyan feel for a warmer, "institutional" cream/royal-blue/gold feel (more like a school portal than a HUD). Both themes share the same variable names, so components never need theme-specific logic — they just read CSS variables.

Theme is toggled by adding a `.light-mode` class to `:root` (see `ThemeContext.tsx`); the switch is animated (`transition: background-color 0.3s ease, color 0.3s ease` on `body`).

---

## 2. Color Palette

### 2.1 Dark mode (default)

**Backgrounds** — layered, darkest at the base, lighter as elements sit "closer" to the user:

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#080B18` | App background |
| `--bg-sidebar` | `#0A0D1A` | Sidebar |
| `--bg-card` | `#0E1225` | Cards / panels |
| `--bg-input` | `#131729` | Form inputs |
| `--bg-elevated` | `#1E2035` | Raised surfaces (dropdowns, popovers) |
| `--bg-elevated-hover` | `#1A1F3A` | Hover state of elevated surfaces |
| `--bg-elevated-soft` | `#111528` | Softer elevated surface |
| `--bg-code` | `#0D1328` | Code editor background |
| `--bg-code-gutter` | `#101737` | Code editor line-number gutter |
| `--bg-deep` / `--bg-soft` | `#0D0D1A` / `#12121E` | General deep/soft fills |
| `--bg-viz` | `rgba(10,14,40,0.6)` | Visualizer canvas background |
| `--bg-viz-strong` | `rgba(20,28,61,0.9)` | Visualizer emphasis background |

**Accent colors:**

| Token | Value | Use |
|---|---|---|
| `--purple` | `#2F4BC4` | Primary brand blue/purple (gradients, buttons) |
| `--purple-light` | `#4A63D8` | Lighter variant for gradients/hover |
| `--accent` | `#6C8EF5` | General accent (links, highlights, active states) |
| `--cyan` | `#00D4AA` | Secondary accent / success color |
| `--cyan-light` | `#4EECD4` | Lighter cyan for gradients/hover |

The signature look is a **purple → cyan gradient** (`linear-gradient(135deg, var(--purple), var(--cyan))`), used on primary buttons and key brand moments (e.g. the sign-up "Next" button).

**Text:**

| Token | Value | Use |
|---|---|---|
| `--text-primary` | `#F0F2FF` | Main body/heading text |
| `--text-soft` | `#D0D7E8` | Slightly muted body text |
| `--text-viz` | `#E8EAFF` | Text inside visualizers |
| `--text-secondary` | `#8892B0` | Labels, secondary copy |
| `--text-muted` | `#4A5568` | Disabled / least-important text |

**Semantic / status:**

| Token | Value | Use |
|---|---|---|
| `--success` | `#00D4AA` | Success states (same as cyan) |
| `--error` | `#FF6B8A` | Errors, validation, destructive actions |
| `--xp` | `#FFB830` | XP / gamification highlight (amber/gold) |

**Borders & surfaces** — borders and hover/overlay tints are white at low opacity, scaled in fixed steps so any component can "step up" a level of emphasis without introducing a new color:

- `--border`: `rgba(255,255,255,0.07)` (default), `--border-accent`: `rgba(99,179,237,0.3)` (focused/active)
- `--surface-01` through `--surface-30`: `rgba(255,255,255, 0.01 → 0.3)` — used for hover states, subtle fills, and layered overlays. Higher number = more visible.

### 2.2 Light mode

Light mode is **not** a simple inversion — it intentionally uses warm cream tones (never stark white) and swaps the sci-fi purple/cyan for a royal-blue/gold "institutional" colorway:

| Token | Value | Note |
|---|---|---|
| `--bg-base` | `#FAF6EC` | Warm cream, not white |
| `--bg-sidebar` / `--bg-card` | `#FDFBF4` | |
| `--bg-input` | `#F3EEDE` | |
| `--bg-elevated` | `#F1EBD9` | |
| `--bg-code` | `#17203B` | Code editor stays dark even in light mode (readability) |
| `--purple` / `--accent` | `#2A4AC4` | Royal blue |
| `--cyan` | `#0E8F72` | Deeper teal/green |
| `--xp` | `#B8860B` | Dark gold (vs. bright amber in dark mode) |
| `--error` | `#C4302B` | Deeper red for contrast on light backgrounds |
| `--text-primary` | `#23201A` | Warm near-black |
| `--text-secondary` | `#6B5F3E` | Warm brown-grey |

Surfaces/borders in light mode use the same `--surface-XX` naming but built from `rgba(40,30,10, …)` (warm dark) instead of white, so hover/overlay states darken rather than lighten.

**Rule of thumb when adding new UI:** never hardcode a hex value in a component's CSS. Always reference the CSS variable (`var(--bg-card)`, `var(--accent)`, etc.) so it adapts automatically between themes.

---

## 3. Typography

Three typefaces, each with a distinct job — this is the most important rule to keep consistent:

| Font | Loaded weights | Role |
|---|---|---|
| **Syne** | 400–800 | Default UI font — body text, headings, buttons, forms, nav. This is the "voice" of the app. |
| **Orbitron** | 400–900 | Display/brand font — used sparingly for hero moments: sidebar logo, login/signup headline titles, big success states. Gives the sci-fi/HUD feel. |
| **JetBrains Mono** | 300–500 | Monospace — used for anything numeric, code-like, or data-dense: XP counters, timestamps, stat readouts, the code editor, password-strength labels. |

Loaded via Google Fonts in `index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
```

Body default: `font-family: 'Syne', sans-serif;` on `<body>`.

**Guideline for new components:**
- Default to Syne for anything a user reads as prose or a label.
- Reach for Orbitron only for a small number of high-impact headline moments — overusing it dilutes its "special" feel.
- Reach for JetBrains Mono whenever a value is a number, code, timer, or ID — it signals "this is data" at a glance and lines up nicely in tables/HUD-style layouts.

---

## 4. Layout & Elevation

The app uses a **layered elevation model** via the `--bg-*` scale rather than box-shadows to convey depth: each step up (`base` → `sidebar`/`card` → `input` → `elevated`) is a slightly lighter (dark mode) or slightly different-toned (light mode) fill. Combine with the `--surface-XX` white/dark-tint scale for hover and pressed states instead of introducing new colors.

Borders are intentionally subtle (`--border` at 7% opacity) — separation between sections comes primarily from the background elevation scale, with hairline borders as a secondary cue.

---

## 5. Motion

Framer Motion drives page/element transitions and gamified feedback (XP gains, level-ups, correct/incorrect answers). Theme switching itself is a plain CSS transition (`0.3s ease`) scoped to `background-color`/`color` on `body` only — deliberately **not** applied as a blanket `* { transition }`, to avoid layout jank when other properties change.

---

## 6. Where to Look in Code

| What | File |
|---|---|
| All color tokens (dark + light) | `src/index.css` |
| Theme toggle logic | `src/store/ThemeContext.tsx` |
| Font imports | `src/index.css` (top of file) |
| Visualizer-specific styling | `src/components/visualizers/visualizers.css` |
| Per-page styling | co-located `*.css` file next to each page in `src/pages/**` |

---

## 7. Quick Reference Card

```text
Dark mode:  bg #080B18 · card #0E1225 · text #F0F2FF · accent #6C8EF5
            gradient: purple #2F4BC4 → cyan #00D4AA · xp gold #FFB830 · error #FF6B8A

Light mode: bg #FAF6EC (cream) · card #FDFBF4 · text #23201A · accent #2A4AC4 (royal blue)
            secondary: teal #0E8F72 · xp gold #B8860B · error #C4302B

Fonts:      Syne (UI/body) · Orbitron (display/brand, sparingly) · JetBrains Mono (numbers/code)
```
