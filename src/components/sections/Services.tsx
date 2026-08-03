"use client";

import { useApp } from "@/components/providers/AppProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";
import Spotlight from "@/components/ui/Spotlight";
import ServiceIcon from "@/components/ui/ServiceIcon";

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
          <Reveal key={svc.slug} delay={i * 90} className="h-full">
            <Spotlight>
              <article className="group flex h-full flex-col rounded-2xl border border-line bg-surface/80 p-6 transition duration-300 hover:border-nova/40 hover:bg-surface">
                <div className="flex items-start justify-between">
                  <ServiceIcon icon={svc.icon} />
                  <span className="font-mono text-xs text-nova-soft/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-medium text-ink">
                  {svc.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{svc.body}</p>
              </article>
            </Spotlight>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
