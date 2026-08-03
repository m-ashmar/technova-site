"use client";

import { useApp } from "@/components/providers/AppProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

export default function Work() {
  const { t, projects } = useApp();
  const w = t.sections.work;

  return (
    <section id="work" className="mx-auto max-w-6xl px-5 py-24 md:px-8">
      <Reveal>
        <SectionHeader eyebrow={w.eyebrow} title={w.title} lead={w.lead} />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        {projects.map((p, i) => {
          const card = (
            <article className="flex h-full flex-col rounded-2xl border border-line bg-surface/50 p-7 transition duration-300 group-hover:border-nova/40 group-hover:bg-surface">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      dir="ltr"
                      className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span
                  className={`ar-tight whitespace-nowrap font-mono text-[10px] tracking-[0.2em] ${
                    p.status === "live" ? "text-nova-soft" : "text-muted"
                  }`}
                >
                  {p.status === "live" ? "● " : "◌ "}
                  {w.statusLabels[p.status]}
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl font-medium text-ink">
                {p.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-muted">
                {p.summary}
              </p>
              {p.highlight ? (
                <p className="mt-5 font-mono text-xs text-ink/80">{p.highlight}</p>
              ) : null}
            </article>
          );

          return (
            <Reveal key={p.slug} delay={i * 60} className="h-full">
              {p.link ? (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full"
                >
                  {card}
                </a>
              ) : (
                <div className="group h-full">{card}</div>
              )}
            </Reveal>
          );
        })}
      </div>
      <p className="mt-8 font-mono text-xs text-muted/70">{w.note}</p>
    </section>
  );
}
