"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";
import { localeMeta } from "@/lib/i18n";

export default function Nav() {
  const { t, locale, toggleLocale } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight whichever section owns the most of the screen.
  useEffect(() => {
    const ids = t.nav.links.map((l) => l.id);
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0.2;
        for (const [id, r] of ratios) {
          if (r > bestRatio) {
            best = id;
            bestRatio = r;
          }
        }
        setActive(best);
      },
      { threshold: [0, 0.2, 0.5, 0.8] }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [t]);

  // The open menu owns the screen: lock scroll, and Escape closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen
          ? "border-b border-line bg-bg/70 backdrop-blur-md"
          : ""
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <a
          href="#top"
          onClick={() => setMenuOpen(false)}
          className="group flex items-center gap-2.5"
          aria-label="TechNova"
        >
          <svg
            viewBox={STAR_GLYPH_VIEWBOX}
            className="h-6 w-auto transition-transform duration-500 group-hover:scale-110"
            aria-hidden
          >
            <path d={STAR_GLYPH_PATH} fill="#EAF2FF" />
          </svg>
          <span
            dir="ltr"
            className="brand-mark font-display text-sm font-medium tracking-[0.3em]"
          >
            <span className="text-ink">TECH</span>
            <span className="text-nova">NOVA</span>
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {t.nav.links.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                aria-current={active === l.id ? "true" : undefined}
                className={`relative py-1 text-sm transition ${
                  active === l.id ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-px origin-center bg-nova transition-transform duration-300 ${
                    active === l.id ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLocale}
            className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition hover:border-nova-soft/60 hover:text-ink"
            aria-label="Switch language"
          >
            {localeMeta[locale === "en" ? "ar" : "en"].label}
          </button>
          <a
            href="#contact"
            className="hidden rounded-full bg-cta px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 hover:shadow-[0_0_20px_rgb(10_132_255/45%)] sm:inline-flex"
          >
            {t.nav.cta}
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Menu"
            className="relative h-9 w-9 md:hidden"
          >
            <span
              className={`absolute inset-x-2 h-px bg-ink transition-all duration-300 ${
                menuOpen ? "top-1/2 rotate-45" : "top-[15px]"
              }`}
            />
            <span
              className={`absolute inset-x-2 top-1/2 h-px bg-ink transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute inset-x-2 h-px bg-ink transition-all duration-300 ${
                menuOpen ? "top-1/2 -rotate-45" : "bottom-[15px]"
              }`}
            />
          </button>
        </div>
      </nav>
      </header>

      {/*
        The panel is deliberately a SIBLING of <header>, not a child. The header
        gains `backdrop-blur-md` while the menu is open, and `backdrop-filter`
        makes an element a containing block for its fixed descendants — so
        `top-16 bottom-0` resolved against the header's 65px box and the panel
        computed to 0px tall, painting nothing at all on every phone.
      */}
      <div
        id="mobile-menu"
        inert={!menuOpen}
        className={`fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto overscroll-contain bg-bg/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <ul className="flex flex-col gap-2 px-6 pt-10">
          {t.nav.links.map((l, i) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={() => setMenuOpen(false)}
                style={{ transitionDelay: menuOpen ? `${i * 60 + 80}ms` : "0ms" }}
                className={`flex items-baseline gap-4 border-b border-line py-5 font-display text-2xl text-ink transition-all duration-500 ${
                  menuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                }`}
              >
                <span className="font-mono text-xs text-nova-soft/70">
                  0{i + 1}
                </span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="px-6 pt-10">
          <a
            href="#contact"
            onClick={() => setMenuOpen(false)}
            className="inline-flex rounded-full bg-cta px-7 py-3 text-sm font-medium text-white shadow-[0_0_28px_rgb(10_132_255/45%)]"
          >
            {t.nav.cta}
          </a>
        </div>
      </div>
    </>
  );
}
