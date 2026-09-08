"use client";

import { useApp } from "@/components/providers/AppProvider";
import Reveal from "@/components/ui/Reveal";

/**
 * Studio (`#about`), design-system §5: a label on a rule, one statement, a
 * numbers row of four facts on a shared rule, then the three steps of how we
 * work. The statement spans cols 1–8 so the organism (ScrollDirector chapter
 * `#about`, offX +0.5·side) drifts into cols 9–12. No cards, no icons.
 */

export default function About() {
  const { t } = useApp();
  const a = t.sections.about;

  return (
    <section
      id="about"
      aria-labelledby="about-label"
      className="wrap py-[clamp(6rem,14vh,10rem)]"
    >
      <Reveal>
        <div className="rule-strong pt-4">
          <h2 id="about-label" className="t-label text-muted">
            {a.eyebrow}
          </h2>
        </div>
      </Reveal>

      <div className="grid-12 mt-16 md:mt-24">
        <Reveal className="col-span-12 md:col-span-8">
          <p className="t-statement text-ink">{a.statement}</p>
        </Reveal>
      </div>

      {/* Numbers row: four facts on one shared rule. Source order is label
          then value (a definition list); the column is reversed visually so
          the value sits over its label. */}
      <div className="grid-12 mt-20 md:mt-28">
        <Reveal className="col-span-12 md:col-span-8">
          <dl className="rule grid grid-cols-2 gap-x-[clamp(1rem,2vw,2rem)] gap-y-10 pt-8 md:grid-cols-4">
            {a.facts.map((f) => (
              <div key={f.label} className="flex flex-col-reverse gap-3">
                <dt className="t-label text-muted">{f.label}</dt>
                <dd className="t-title text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      {/* How we work: three steps across the grid, vertical hairlines between
          them on md+ (padded by the `.grid-12` gutter so the lines sit where
          its columns meet), a top rule between them when stacked. */}
      <div className="grid-12 mt-20 md:mt-28">
        <Reveal className="col-span-12 md:col-span-8">
          <div className="rule pt-4">
            <h3 className="t-label text-muted">{a.processTitle}</h3>
          </div>
        </Reveal>
        <ol
          role="list"
          className="col-span-12 mt-10 md:col-span-8 md:mt-14 md:grid md:grid-cols-3"
        >
          {a.process.map((step, i) => (
            <li
              key={step.n}
              className={
                i === 0
                  ? "md:pe-[clamp(1rem,2vw,2rem)]"
                  : "mt-10 border-t border-line pt-10 md:mt-0 md:border-t-0 md:border-s md:ps-[clamp(1rem,2vw,2rem)] md:pe-[clamp(1rem,2vw,2rem)] md:pt-0"
              }
            >
              <Reveal delay={i * 90}>
                <span className="t-label block text-muted">{step.n}</span>
                <h4 className="t-row mt-5 text-ink">{step.title}</h4>
                <p className="t-small mt-4 max-w-[38ch] text-ink-soft">
                  {step.body}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
