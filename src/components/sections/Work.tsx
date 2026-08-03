"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

function EmbedFrame({
  url,
  closeLabel,
  onClose,
}: {
  url: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-nova/30 bg-bg shadow-[0_0_40px_rgb(10_132_255/15%)]">
      <div
        dir="ltr"
        className="flex items-center justify-between border-b border-line bg-surface/80 px-3 py-2"
      >
        <span className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-nova/60" />
        </span>
        <span className="font-mono text-[10px] text-muted">
          {new URL(url).host}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] tracking-[0.15em] text-muted transition hover:text-ink"
        >
          ✕ {closeLabel}
        </button>
      </div>
      <iframe
        src={url}
        title={url}
        loading="lazy"
        className="aspect-[16/10] w-full bg-black"
      />
    </div>
  );
}

export default function Work() {
  const { t, projects } = useApp();
  const w = t.sections.work;
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const toggleEmbed = (slug: string | null) => {
    setOpenSlug(slug);
    // sections below move — let ScrollDirector re-measure trigger positions
    setTimeout(() => window.dispatchEvent(new Event("nova:layout")), 60);
  };

  return (
    <section id="work" className="mx-auto max-w-6xl px-5 py-24 md:px-8">
      <Reveal>
        <SectionHeader eyebrow={w.eyebrow} title={w.title} lead={w.lead} />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        {projects.map((p, i) => (
          <Reveal key={p.slug} delay={i * 60} className="h-full">
            <article className="group flex h-full flex-col rounded-2xl border border-line bg-surface/50 p-7 transition duration-300 hover:border-nova/40 hover:bg-surface">
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
                {p.link ? (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-nova-soft"
                  >
                    {p.title} <span aria-hidden>↗</span>
                  </a>
                ) : (
                  p.title
                )}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-muted">
                {p.summary}
              </p>
              {p.highlight ? (
                <p className="mt-5 font-mono text-xs text-ink/80">{p.highlight}</p>
              ) : null}

              {p.media?.embed ? (
                openSlug === p.slug ? (
                  <EmbedFrame
                    url={p.media.embed}
                    closeLabel={w.closeLabel}
                    onClose={() => toggleEmbed(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleEmbed(p.slug)}
                    className="ar-tight mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-nova/40 px-4 py-2 font-mono text-[11px] tracking-[0.15em] text-nova-soft transition hover:bg-nova/10"
                  >
                    <span aria-hidden>▶</span> {w.playLabel}
                  </button>
                )
              ) : null}
            </article>
          </Reveal>
        ))}
      </div>
      <p className="mt-8 font-mono text-xs text-muted/70">{w.note}</p>
    </section>
  );
}
