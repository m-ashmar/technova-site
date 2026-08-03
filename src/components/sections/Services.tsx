"use client";

import { useApp } from "@/components/providers/AppProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

export default function Services() {
  const { t, services } = useApp();
  const s = t.sections.services;

  return (
    <section id="services" className="mx-auto max-w-6xl px-5 py-24 md:px-8">
      <Reveal>
        <SectionHeader eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((svc, i) => (
          <Reveal key={svc.slug} delay={i * 70} className="h-full">
            <article className="h-full rounded-2xl border border-line bg-surface/60 p-6 transition duration-300 hover:border-nova/40 hover:bg-surface">
              <p className="font-mono text-xs text-nova-soft/80">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-4 font-display text-lg font-medium text-ink">
                {svc.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">{svc.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
