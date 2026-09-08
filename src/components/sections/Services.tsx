"use client";

import { useCallback, useState } from "react";
import {
  useApp,
  type LocalizedService,
} from "@/components/providers/AppProvider";
import type { Locale } from "@/lib/i18n";
import Reveal from "@/components/ui/Reveal";
import ServiceIcon from "@/components/ui/ServiceIcon";

/**
 * Capabilities (`#services`), design-system §5: a label on a rule, then four
 * rows. There is no title — the rows are the title. On md+ the living graph
 * (ScrollDirector chapter `#services`, offX −0.62·side) owns cols 1–5, so
 * nothing is rendered there; the rows fill cols 6–12. No cards, no
 * expand/collapse: everything is visible.
 */

/**
 * Snaps a glyph back to its undrawn state for one frame. Releasing it lets the
 * existing entrance transition in globals.css (`.reveal.is-in .icon-draw
 * [data-draw]`, stroke-dashoffset 1 → 0; `[data-fade]` opacity 0 → 1) run
 * again, so hover replays exactly the draw the row played on reveal. The `!`
 * is required: those icon rules are unlayered and outrank plain utilities.
 */
const GLYPH_RESET =
  "[&_[data-draw]]:[transition:none]! [&_[data-draw]]:[stroke-dashoffset:1]! " +
  "[&_[data-fade]]:[transition:none]! [&_[data-fade]]:[opacity:0]!";

function CapabilityRow({
  svc,
  index,
  locale,
}: {
  svc: LocalizedService;
  index: number;
  locale: Locale;
}) {
  const [resetting, setResetting] = useState(false);

  const replay = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setResetting(true);
    // Two frames: the first paints the reset, the second releases it so the
    // stroke transition has a real "from" value to run from.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setResetting(false))
    );
  }, []);

  return (
    <li
      className="group border-t border-line transition-colors duration-300 hover:border-line-strong focus-within:border-line-strong"
      onPointerEnter={replay}
      onFocus={replay}
    >
      <Reveal delay={index * 80}>
        <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-4 gap-y-3 py-7 md:gap-x-6 md:py-9">
          <span
            className={`col-start-1 row-start-1 mt-1 self-start ${resetting ? GLYPH_RESET : ""}`}
          >
            <ServiceIcon icon={svc.icon} size={28} />
          </span>
          <h3 className="t-row col-start-2 row-start-1 text-ink">
            {svc.title}
          </h3>
          <span
            className="t-label col-start-3 row-start-1 self-start pt-2 text-muted"
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="t-small col-span-2 col-start-2 max-w-[42ch] text-ink-soft">
            {svc.body}
          </p>
          {/* Three deliverables as one label line. The label tier is set for a
              single line; this line wraps on almost every viewport, so it takes
              a taller leading (the tier is unlayered, hence the `!`). */}
          <p className="t-label col-span-2 col-start-2 leading-[1.8]! text-muted">
            {svc.deliverables[locale].join(" · ")}
          </p>
        </div>
      </Reveal>
    </li>
  );
}

export default function Services() {
  const { t, services, locale } = useApp();
  const s = t.sections.services;

  return (
    <section
      id="services"
      aria-labelledby="services-label"
      className="wrap py-[clamp(6rem,14vh,10rem)]"
    >
      <Reveal>
        <div className="rule-strong pt-4">
          <h2 id="services-label" className="t-label text-muted">
            {s.eyebrow}
          </h2>
        </div>
      </Reveal>

      <div className="grid-12 mt-16 md:mt-24">
        {/* Cols 1–5 are left to the organism on md+. */}
        <ul
          role="list"
          className="col-span-12 border-b border-line md:col-span-7 md:col-start-6"
        >
          {services.map((svc, i) => (
            <CapabilityRow
              key={svc.slug}
              svc={svc}
              index={i}
              locale={locale}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
