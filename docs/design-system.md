# TechNova — design system (v2, "composed with the organism")

This is the contract every section below the hero is built against. Read
`docs/design-backlog.md` first for the invariants; this file says what the
site *is*, not what it was.

## 0. What must not change

- `src/components/hero/NovaScene.tsx`, `src/lib/star.ts`, `src/lib/shapes.ts`,
  `src/lib/webgl.ts`, `src/lib/novaState.ts`, `BootConsole.tsx`,
  `SceneBoundary.tsx`, `NovaStage.tsx`, `IgnitionHero.tsx`, `Signature.tsx`:
  **sealed**. Not one byte. The star, the particle physics, the morph order
  (star → data current → living graph → wordmark) and the wordmark landing
  above NOVA are the product.
- `src/components/site/ScrollDirector.tsx`: **composition only**. The
  `chapters` array (where the organism parks, how it drifts) may change; the
  lerp math, the `basePose`, the event wiring and the dev bridge may not.
- The hero lockup (TE ★ CH / NOVA) keeps Orbitron via `.brand-mark`. Every
  other piece of text on the site changes face.
- Section ids stay `work`, `services`, `about`, `signature`, `contact` (the
  hero's hash logic, the console strip and the nav key off them). Labels change;
  ids do not.

## 1. The idea

No boxes below the hero. Whitespace, hairline rules, large type and real
product imagery, with the particle organism occupying whichever column the
layout leaves empty. Every section has its own rhythm; no two look alike. The
visitor is given one thing to do: talk to NOVA.

What reads as "template" and is therefore banned:
- `rounded-2xl border border-line bg-surface` (or any card) as a content
  container. Rules (`border-top: 1px`) and space do the separating.
- The eyebrow → title → lead header repeated per section. Each section opens
  differently (see §5).
- Decorative icons. The service glyphs stay because they are drawn, specific
  and reused as inline marks, not as card ornaments.
- Abstract virtue words (innovation, excellence, reliability, partnership,
  cutting-edge, seamless, leverage, empower, world-class, passionate).
- Anything time-stamped or "live" (no clocks, no "this month", no dates in
  labels). The site is timeless on purpose.

## 2. Type

Faces (loaded in `src/app/layout.tsx` with `next/font/google`; check
`node_modules/next/dist/docs/` for the current API before editing):

| Role | Family | Variable | Notes |
|---|---|---|---|
| Display (Latin) | Bricolage Grotesque | `--font-display-latin` | variable, axes `opsz` + `wdth`; `font-optical-sizing: auto` |
| Body (Latin) | Instrument Sans | `--font-sans-latin` | variable |
| Mono | JetBrains Mono | `--font-jbmono` | unchanged; labels only, never paragraphs |
| Display (Arabic) | Noto Kufi Arabic | `--font-ar-display` | `preload: false`, weights 400/500/700 |
| Body (Arabic) | IBM Plex Sans Arabic | `--font-ar` | unchanged |
| Logo | Orbitron | `--font-orbitron` | **`.brand-mark` only** |

Tailwind theme tokens in `globals.css`: `--font-display` → Bricolage,
`--font-sans` → Instrument Sans, `--font-mono` → JetBrains Mono. Add
`.brand-mark { font-family: var(--font-orbitron); }` so the hero lockup and
the nav logo are untouched.

Arabic: `html.lang-ar .font-display:not(.brand-mark)` and every `.t-*` tier
switch to `--font-ar-display` for display tiers and `--font-ar` for body, with
`letter-spacing: 0` and a taller line-height (display 1.25, body 1.8). Arabic is
designed, not translated: numerals in Arabic copy use Arabic-Indic digits as
the JSON already does; mono labels stay Latin-mono with Arabic fallback.

Tiers (utility classes in `globals.css`, applied to elements, not to wrappers):

| Class | Face | Size | Line | Tracking | Weight |
|---|---|---|---|---|---|
| `.t-statement` | display | `clamp(2.5rem, 5.2vw, 5.25rem)` | 1.02 | −0.02em | 500 |
| `.t-title` | display | `clamp(1.9rem, 3.2vw, 3rem)` | 1.08 | −0.015em | 500 |
| `.t-row` | display | `clamp(1.5rem, 2.6vw, 2.5rem)` | 1.1 | −0.01em | 500 |
| `.t-lead` | sans | `clamp(1.125rem, 1.35vw, 1.375rem)` | 1.5 | 0 | 400 |
| `.t-body` | sans | `1.0625rem` | 1.65 | 0 | 400 |
| `.t-small` | sans | `0.9375rem` | 1.6 | 0 | 400 |
| `.t-label` | mono | `0.6875rem` | 1 | 0.18em | 500, uppercase |
| `.t-numeral` | display | `clamp(3.5rem, 9vw, 8rem)` | 0.9 | −0.04em | 300, `color: rgb(242 245 251 / 10%)` |

Measure: body paragraphs `max-width: 34ch` (Latin) / `38ch` (Arabic).
Statement paragraphs `max-width: 18ch`.

## 3. Colour and surface

Tokens stay: `--color-bg #050608`, `--color-ink #f2f5fb`, `--color-muted
#8a93a6`, `--color-nova #0a84ff`, `--color-nova-soft #4d9aff`, `--color-cta
#0b6fd8`, `--color-line rgb(255 255 255 / 8%)`. Add:

- `--color-ink-soft: #c3c9d6` — secondary running text (body paragraphs use
  this, `muted` is for labels and metadata only).
- `--color-line-strong: rgb(255 255 255 / 16%)` — rules that carry meaning
  (section openers, the terminal header).

`--color-surface` survives only for the NOVA input field and the media frames.
Nothing else gets a filled background.

## 4. Grid and rhythm

- `.wrap`: `max-width: 1440px; margin-inline: auto; padding-inline: clamp(1.25rem, 4vw, 4rem)`.
- `.grid-12`: 12 columns, `gap: clamp(1rem, 2vw, 2rem)`. Use CSS grid column
  placement (`col-start`/`col-span`) with **logical** properties everywhere
  (`ms-`, `me-`, `ps-`, `text-start`) so RTL mirrors for free. Never `left`/
  `right` classes in content components.
- Vertical rhythm varies on purpose: Work acts are `min-height: 100svh`
  each; Capabilities and Studio are `padding-block: clamp(6rem, 14vh, 10rem)`;
  Contact is `min-height: 90svh`.
- Media never sits in a card. Frames are CSS-only device chrome
  (`.frame-browser`: 1px `line-strong` border, 10px radius, a 28px title bar
  with three 8px dots; `.frame-tablet`: 18px radius, 12px bezel; `.frame-phone`:
  36px radius, 10px bezel, aspect 9/19.5). All frames `background:
  var(--color-surface)`, no shadow, no glow.
- Images: `next/image` with real `sizes`, `alt` from content, `loading="lazy"`
  below the fold. Missing images are **not** placeholders: an act with no
  images renders text-only and leaves its media column to the organism.
- Mobile (`< md`): single column, text first, media below, frames full width,
  acts `min-height: auto` with `padding-block: 5rem`.

## 5. Sections

### Work (`#work`) — five acts
Opener: a single `.t-label` "01 — Work" on a `line-strong` rule, then the
title in `.t-statement` on the left 7 columns, and the lead in `.t-lead` on the
right 4 columns (offset by one). Nothing else.

Each act (`<article id="act-N" data-act={N}>`, N = project `order`), by
`media.layout`:

| layout | text | media | organism (ScrollDirector) |
|---|---|---|---|
| `media-end` | cols 1–5 | cols 6–12, floats over the current | `offX: +0.62·side` |
| `media-start` | cols 8–12 | cols 1–7 | `offX: −0.62·side` |
| `theatre` | full width above | the RUN LIVE embed, full 12 cols, 16:10 | centre, `zoom: 0.7`, `offY: −0.15` |
| `spec` | cols 1–5 | cols 7–12: a mono spec sheet (rows of label / value on hairline rules) | `offX: +0.62·side` |
| `phones` | cols 1–5 | cols 7–12: three phone frames, staggered by 2rem, 1.5rem, 0 | `offX: +0.62·side, offY: 0.06` |

Text column of every act, top to bottom: `.t-numeral` (`01`), a `.t-label`
row (status · tags joined by " · "), `.t-title`, `.t-body` summary in
`ink-soft`, a **ledger** (2–3 rows, `.t-label` key / `.t-small` value, on
hairline rules), and one link (`.t-label`, arrow glyph `↗` in Latin / `↖` in
Arabic via logical text). The `highlight` string renders as the first ledger
row.

The embed (`EmbedFrame`) keeps its exact sandbox attributes and the
`NOVA_LAYOUT_EVENT` dispatch on toggle.

### Capabilities (`#services`) — four rows
Opener: `.t-label` "02 — Capabilities" on a rule; **no title**. The rows are
the title. The organism (living graph) sits in cols 1–5; the rows fill cols
6–12. Each row: the drawn glyph (`ServiceIcon`, 28px, inline-start), the name
in `.t-row`, and on the same row's end a `.t-label` index. Below the name, the
one-sentence body in `.t-small`, and three deliverables as a `.t-label` line
joined by " · ". Rows are separated by hairline rules; hover/focus brightens
the rule to `line-strong` and the glyph plays its draw animation. No cards, no
expand/collapse JS — everything is visible.

### Studio (`#about`) — one statement, a numbers row, how we work
Opener: `.t-label` "03 — Studio" on a rule. Then the statement in
`.t-statement` across cols 1–8 (the organism drifts to cols 9–12). Under it a
numbers row: four facts, each `.t-title` value over `.t-label` label, on a
shared top rule, no boxes. Then "How we work": three steps across cols 1–12,
each a `.t-label` number, a `.t-row` title, a `.t-small` body, separated by
vertical hairlines on desktop. No value cards. No icons.

### Signature (`#signature`) — sealed.

### Contact (`#contact`) — NOVA as the site's terminal
`.grid-12`: cols 1–5 is the invitation: `.t-label` "04 — Contact" on a rule,
"Start a project" in `.t-statement`, the body in `.t-body`, the email as a
`.t-row` display link, and the reply promise as `.t-label`. Cols 6–12 is the
terminal: a `line-strong` top rule with a mono header line
(`nova.intake — v1`), then `NovaChat`. The terminal has **no border and no
fill**; NOVA's lines carry a 4-pointed star glyph in `nova-soft` at the start;
the visitor's lines are `ink`, aligned to the end; option buttons are hairline
pills in `.t-label`; the text field is a bottom rule with a blinking caret
(`::after`, respects reduced motion); the primary action is `bg-cta`. All
step logic, sessionStorage persistence, focus management, live region and
`aria-labelledby` stay exactly as they are.

### Footer
Top rule, `.grid-12`: cols 1–4 the wordmark (`.brand-mark`, 14px, tracking
0.4em) and one `.t-small` line naming what the company is; cols 6–9 the four
nav links as `.t-small`; cols 10–12 the email as a mono link and the rights
line. No credit slogan.

### Nav
Structure and behaviour unchanged. Link labels from JSON (Work, Capabilities,
Studio, Contact). Links in `.t-small`; logo keeps `.brand-mark`.

## 6. Copy rules (EN and AR, same rules)

- Specific over confident. Name the rail, the rule set, the mechanism.
- Company voice, "we". No founder, no names, no "I".
- Never call the judging anomaly flagging "AI" or "machine learning". It is
  statistical outlier detection. "Scores that drift from the panel are flagged
  as they happen" is the ceiling.
- The boutique platform is unnamed and unlinked. Yalla Gym is "our own, in
  development". The federation is named and linked.
- No athlete names, no buyer details, no revenue, no wallet addresses.
- No dates, no "this month", no counters that imply liveness.
- Keep the brand tagline "SOLUTIONS THAT INSPIRE" / "حلول تُلهِم" in the hero.
- Arabic is written as Arabic: sentence rhythm, Arabic-Indic digits, no
  transliterated English idioms. Parity of keys with EN is enforced by
  `scripts/check-content.mjs`.

## 7. Motion

`.reveal` stays for entrance (opacity + 12px translate, 600ms, once). Frames
in Work get a 1–2% parallax on scroll via `transform`, JS-free where possible
(`animation-timeline: view()` with a `@supports` guard, falling back to
static). Everything respects `prefers-reduced-motion`.
