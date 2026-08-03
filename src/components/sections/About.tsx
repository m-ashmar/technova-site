"use client";

import { useApp } from "@/components/providers/AppProvider";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

export default function About() {
  const { t } = useApp();
  const a = t.sections.about;

  return (
    <section id="about" className="mx-auto max-w-6xl px-5 py-24 md:px-8">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <Reveal>
          <SectionHeader eyebrow={a.eyebrow} title={a.title} />
          <p className="max-w-xl text-base leading-8 text-muted">{a.body}</p>
        </Reveal>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {a.values.map((v, i) => (
            <Reveal key={v.title} delay={i * 70}>
              <div className="rounded-2xl border border-line bg-surface/40 p-5">
                <h3 className="font-display text-sm font-medium tracking-wide text-nova-soft">
                  {v.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
