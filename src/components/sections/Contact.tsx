"use client";

import { useApp } from "@/components/providers/AppProvider";
import Reveal from "@/components/ui/Reveal";
import NovaChat from "@/components/nova/NovaChat";

export default function Contact() {
  const { t } = useApp();
  const c = t.sections.contact;

  return (
    <section id="contact" className="mx-auto max-w-4xl px-5 py-28 md:px-8">
      <Reveal className="text-center">
        <p className="ar-tight font-mono text-xs tracking-[0.35em] text-nova-soft/90">
          {c.eyebrow}
        </p>
        <h2 className="mt-4 font-display text-3xl font-medium text-ink md:text-5xl">
          {c.title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted md:text-base">
          {c.body}
        </p>
      </Reveal>

      <Reveal delay={120} className="mt-10">
        <NovaChat />
      </Reveal>

      <Reveal delay={200} className="mt-8 text-center">
        <p className="text-xs text-muted">
          {c.emailLabel}{" "}
          <a
            href={`mailto:${c.email}`}
            dir="ltr"
            className="font-mono text-ink/90 transition hover:text-nova-soft"
          >
            {c.email}
          </a>
        </p>
        <p
          dir="ltr"
          className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-muted"
        >
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-nova" />
          {c.novaNote}
        </p>
      </Reveal>
    </section>
  );
}
