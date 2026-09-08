"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import Reveal from "@/components/ui/Reveal";
import Act from "@/components/work/Act";
import { NOVA_LAYOUT_EVENT } from "@/lib/novaState";

/**
 * Work: the opener, then one full-height act per project (design-system §5).
 * The `#work` and `#act-N` ids are the ScrollDirector's chapter triggers.
 */
export default function Work() {
  const { t, projects } = useApp();
  const w = t.sections.work;
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const toggleEmbed = (slug: string | null) => {
    setOpenSlug(slug);
    // sections below move — let ScrollDirector re-measure trigger positions
    setTimeout(() => window.dispatchEvent(new Event(NOVA_LAYOUT_EVENT)), 60);
  };

  const acts = [...projects].sort((a, b) => a.order - b.order);

  return (
    <section id="work" aria-labelledby="work-title" className="pt-24 md:pt-32">
      <div className="wrap">
        <Reveal>
          <p className="t-label rule-strong pt-4 text-muted">{w.eyebrow}</p>
          <div className="grid-12 mt-10 md:mt-14">
            <h2 id="work-title" className="t-statement col-span-12 text-ink md:col-span-7">
              {w.title}
            </h2>
            <p className="t-lead col-span-12 mt-6 text-ink-soft md:col-start-9 md:col-span-4 md:mt-2">
              {w.lead}
            </p>
          </div>
        </Reveal>
      </div>

      {acts.map((p) => (
        <Act
          key={p.slug}
          project={p}
          open={openSlug === p.slug}
          onToggle={toggleEmbed}
        />
      ))}
    </section>
  );
}
