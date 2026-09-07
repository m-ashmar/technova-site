# Design backlog — the structure problem

Not scheduled yet. Recorded so it is not lost, and so whoever picks it up starts
from the real problem rather than a list of tweaks.

## INVARIANTS — the particle system is not part of this work

Owner, 8 Sep 2026:

> The animation of the particles, how they transform from shape to another, and
> in the end they shape TECHNOVA — all of this we need to keep. Maybe we will
> make some edits for the shapes, but we will keep it. Star shape in hero, and
> particles shape TECHNOVA in the end up to the AI assistant — that must be the
> same and untouched during upgrading the rest.

Treat this as a hard constraint on every item below, not a preference.

**Untouchable:**

- The **morph mechanism itself** — one continuous body of particles that
  re-forms rather than being destroyed and recreated. The per-particle stagger,
  the eased transitions, the birth choreography.
- **Stage 1, the star in the hero.** Sampled from the master logo's literal
  Bézier outline and DOM-measured into the TE ★ CH gap at brand-sheet
  proportions. This is the site's best-kept engineering secret.
- **Stage 4, the wordmark** — particles forming TECHNOVA (تكنوفا in Arabic),
  carried through to the AI assistant where it shrinks above the chat. The
  ending is the brand landing on its own name; it does not change.
- The files that implement all of the above stay sealed: `NovaScene.tsx`
  (including the GLSL), `ScrollDirector.tsx`, `star.ts`, `shapes.ts`,
  `novaState.ts`, `webgl.ts`, `BootConsole.tsx`, `SceneBoundary.tsx`,
  `NovaStage.tsx`.

**Open for later discussion, with the owner's consent:**

- The two **intermediate** shapes (the data current, the living graph). "Maybe
  we will make some edits for the shapes" applies here and only here.

**Explicitly allowed, and NOT a change to the particle system:**

- WHERE the organism sits on screen at each stage — its offset, its scale, and
  which side of the layout it occupies. Direction 1 below proposes measuring the
  empty column from the DOM instead of the current magic `offX: ±0.58`. That
  repositions the organism within the composition; it does not alter what it is,
  what it becomes, or how it moves between states.

The distinction that governs everything: **composition may change, choreography
may not.**

## The note (owner, 8 Sep 2026)

> Every website created by AI has the same structure: hero, then services, then
> another cards section, and that's it. I like the hero, the particle system —
> that's perfect, even how it animates. But the rest feels so regular. Even if we
> use advanced techniques like live preview from cards, that's still so basic.
> The cards are so basic.

## Why this is the right diagnosis

The ten-lens audit reached the same conclusion independently, which is the
strongest signal we have that it is real and not taste.

- Art direction scored **5/10** with the verdict: *"the site's one irreplaceable
  asset — a page-wide particle organism — is used as wallpaper behind a
  conventional centred 1152px column of hairline cards."*
- Every content section is literally the same object: `mx-auto max-w-6xl px-5
  py-24`, wrapping `rounded-2xl border border-line bg-surface/NN`. Work, Services
  and About are three consecutive grids of the same card at different column
  counts.
- The card surface measures **1.038:1** against the page and its border
  **1.164:1** — the card system is, in contrast terms, close to invisible. It is
  doing decoration work, not structural work.
- `grep -rn "mix-blend|mask-|clip-path" src/` returns **zero matches**. The
  canvas and the type never interact anywhere on the page.
- The 2026 benchmark lens put it plainly: the engine is near elite, but
  everything below the hero "reads as a very good dev demo rather than a studio
  that wins work."

So the instinct is right, and the cause is structural rather than cosmetic.
Better cards will not fix it. A different relationship between the content and
the organism will.

## The principle to design against

The hero is the only part of the page where the layout and the organism are
composed together — the star is measured into the gap of the TE ★ CH lockup at
the master logo's own proportions. That is exactly why the hero works and the
rest does not.

**Everything below the hero should be composed with the organism, not on top of
it.** Right now the canvas is `fixed inset-0 z-0` and every section is an opaque
column at `z-10`. The organism is scenery. It should be furniture.

## Directions worth exploring (not decisions)

1. **Break the centred column.** Go 12-column and leave real space empty on the
   side the organism occupies — then *measure* that empty column from the DOM and
   feed it to ScrollDirector, exactly as IgnitionHero already measures the letter
   gap. The current `offX: ±0.58` is a magic number matching no feature of the
   page. We already own this technique; use it twice.
2. **Let one thing cross the boundary.** A single card with no background and no
   border on the organism-facing edge, so particles visibly pass behind and
   through it. One crossing is composition; ten would be noise.
3. **Stop repeating the card.** Each section should have its own structure, not
   the same rounded rectangle at a different column count. Work in particular
   should be work-led — media first, chrome second — rather than a SaaS feature
   grid.
4. **Add the missing type tier.** The only `<h1>` is 30px while every `<h2>` is
   36px and Contact's is 48px; the largest *sentence* on the site is 36px. There
   is no statement tier at all, which is why the page reads flat below the hero.
5. **Tie choreography to section length, not section start.** Chapters currently
   interpolate over a fixed window measured from each section's top edge, so
   ~59% of the Work scroll holds a frozen organism — and it gets worse with every
   project added.
6. **Give the visitor one thing to do.** Nothing on the page responds to them
   except cursor repulsion. The site demonstrates capability but never invites
   participation.

## Explicitly not in scope here

Rebuilding the card system before the Work section has actual visual proof in it.
A beautifully chamfered card containing no screenshot still sells nothing — proof
first, then structure, then ornament.
