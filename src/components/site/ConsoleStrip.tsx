"use client";

import { useEffect, useState } from "react";
import { NOVA_LIVE_EVENT } from "@/lib/novaState";
import { useApp } from "@/components/providers/AppProvider";

const SECTION_IDS = ["work", "services", "about", "signature", "contact"] as const;
type SectionId = (typeof SECTION_IDS)[number];

/**
 * Ambient agent status line. Appears once the intro completes, then narrates
 * the journey: each section swaps in its own console line.
 */
export default function ConsoleStrip() {
  const { t } = useApp();
  const [live, setLive] = useState(false);
  const [section, setSection] = useState<SectionId | null>(null);

  useEffect(() => {
    const on = () => setLive(true);
    window.addEventListener(NOVA_LIVE_EVENT, on);
    return () => window.removeEventListener(NOVA_LIVE_EVENT, on);
  }, []);

  useEffect(() => {
    const visible = new Map<SectionId, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id as SectionId;
          visible.set(id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best: SectionId | null = null;
        let bestRatio = 0.12;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setSection(best);
      },
      { threshold: [0, 0.15, 0.35, 0.6] }
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const text = section ? t.console.sections[section] : t.console.online;

  return (
    <div
      dir="ltr"
      aria-hidden
      className={`fixed bottom-4 left-4 z-40 hidden font-mono text-[11px] text-muted/80 transition-opacity duration-700 md:block ${
        live ? "opacity-100" : "opacity-0"
      }`}
    >
      <span key={text} className="inline-block animate-[fadein_0.5s_ease]">
        {text}
      </span>
    </div>
  );
}
