"use client";

import { useApp } from "@/components/providers/AppProvider";

export default function Footer() {
  const { t } = useApp();
  return (
    <footer className="relative z-10 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-center text-xs text-muted md:flex-row md:px-8 md:text-start">
        <p>{t.footer.rights}</p>
        <p className="max-w-md">{t.footer.credit}</p>
        <a
          href={`mailto:${t.sections.contact.email}`}
          dir="ltr"
          className="font-mono transition hover:text-ink"
        >
          {t.sections.contact.email}
        </a>
      </div>
    </footer>
  );
}
