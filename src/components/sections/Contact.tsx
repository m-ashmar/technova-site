"use client";

import { useApp } from "@/components/providers/AppProvider";
import Reveal from "@/components/ui/Reveal";
import NovaChat from "@/components/nova/NovaChat";

/**
 * Contact (design-system §5): the invitation in cols 1–5, NOVA as the site's
 * terminal in cols 6–12. No boxes — rules and space do the separating. On
 * mobile it stacks, invitation first.
 */
export default function Contact() {
  const { t } = useApp();
  const c = t.sections.contact;

  return (
    <section
      id="contact"
      className="wrap pt-32 pb-24 md:flex md:min-h-[90svh] md:flex-col md:justify-center md:py-32"
    >
      <div className="grid-12 items-start">
        <div className="col-span-12 md:col-span-5">
          <Reveal>
            <p className="t-label rule-strong pt-3 text-muted">{c.eyebrow}</p>
            <h2 className="t-statement mt-10 text-ink">{c.statementTitle}</h2>
            <p className="t-body mt-8 text-ink-soft">{c.body}</p>
            <a
              href={`mailto:${c.email}`}
              dir="ltr"
              className="t-row mt-10 inline-block text-ink underline-offset-8 transition hover:text-nova-soft hover:underline [overflow-wrap:anywhere]"
            >
              {c.email}
            </a>
            <p className="t-label mt-6 text-muted">{c.reply}</p>
          </Reveal>
        </div>

        <div className="col-span-12 mt-16 md:col-span-7 md:col-start-6 md:mt-0">
          <Reveal delay={120}>
            <NovaChat />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
