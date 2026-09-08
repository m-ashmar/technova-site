"use client";

import { useApp } from "@/components/providers/AppProvider";

/**
 * Design-system §5 "Footer": a top rule, then the 12-column grid —
 * cols 1–4 the wordmark and one line naming what the company is,
 * cols 6–9 the four nav links, cols 10–12 the email and the rights line.
 * Logical placement only, so RTL mirrors for free.
 */
export default function Footer() {
  const { t } = useApp();
  return (
    <footer className="relative z-10 rule">
      <div className="wrap grid-12 py-14 md:py-20">
        <div className="col-span-12 md:col-span-4">
          <span
            dir="ltr"
            className="brand-mark inline-block text-[14px] font-medium tracking-[0.4em]"
          >
            <span className="text-ink">TECH</span>
            <span className="text-nova">NOVA</span>
          </span>
          <p className="t-small mt-4 text-ink-soft">{t.footer.tagline}</p>
        </div>

        {/* A list, not a second <nav> landmark: the header already owns
            site navigation and duplicate unlabeled landmarks confuse readers. */}
        <div className="col-span-12 md:col-span-4 md:col-start-6">
          <ul className="flex flex-col gap-2">
            {t.nav.links.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  className="t-small text-muted transition hover:text-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-12 flex flex-col gap-3 md:col-span-3 md:col-start-10">
          <a
            href={`mailto:${t.sections.contact.email}`}
            dir="ltr"
            className="font-mono text-xs text-muted transition hover:text-ink text-start"
          >
            {t.sections.contact.email}
          </a>
          <p className="t-small text-muted">{t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
