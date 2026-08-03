"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { novaState } from "@/lib/novaState";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Drives the organism through the scroll journey:
 *
 *   hero       star, centered, full size
 *   #work      -> phone, tucked to the side, small
 *   #services  -> neural web, other side
 *   #signature -> the wordmark (TECHNOVA / تكنوفا), centered
 *   #contact   wordmark floats up small above the NOVA chat
 *
 * The state is recomputed *statelessly* from every chapter's progress on each
 * scroll update — sequential lerps from the base state — so instant jumps
 * (anchor links, programmatic scrolls, reloads mid-page) always land on the
 * exact same values as gradual scrolling. Horizontal offsets mirror in RTL.
 *
 * Layout changes that move sections (e.g. opening a live embed) should
 * dispatch `nova:layout` on window so trigger positions are re-measured.
 */

const BASE = { morph: 0, offX: 0, offY: 0, zoom: 1, idle: 1 };
type ChapterVars = Partial<typeof BASE>;

export default function ScrollDirector() {
  const { dir } = useApp();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (process.env.NODE_ENV === "development") {
      // verification aid, same gate as the canvas DevBridge
      (window as unknown as Record<string, unknown>).__novaState = novaState;
    }
    const side = dir === "rtl" ? -1 : 1;

    const chapters: { sel: string; vars: ChapterVars; st?: ScrollTrigger }[] = [
      { sel: "#work", vars: { morph: 1, offX: 0.58 * side, zoom: 0.55, idle: 0.65 } },
      { sel: "#services", vars: { morph: 2, offX: -0.58 * side, zoom: 0.5, idle: 0.65 } },
      { sel: "#signature", vars: { morph: 3, offX: 0, offY: 0.06, zoom: 0.85, idle: 1 } },
      { sel: "#contact", vars: { offY: 0.4, zoom: 0.45, idle: 0.7 } },
    ];

    const apply = () => {
      const s = { ...BASE };
      for (const ch of chapters) {
        const p = ch.st?.progress ?? 0;
        if (p <= 0) continue;
        for (const key of Object.keys(ch.vars) as (keyof typeof BASE)[]) {
          const target = ch.vars[key];
          if (target !== undefined) s[key] += (target - s[key]) * p;
        }
      }
      novaState.morph = s.morph;
      novaState.offX = s.offX;
      novaState.offY = s.offY;
      novaState.zoom = s.zoom;
      novaState.idle = s.idle;
    };

    for (const ch of chapters) {
      const el = document.querySelector(ch.sel);
      if (!el) continue;
      ch.st = ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        end: "top 25%",
        onUpdate: apply,
        onRefresh: apply,
      });
    }
    apply();

    const onLayout = () => ScrollTrigger.refresh();
    window.addEventListener("nova:layout", onLayout);

    return () => {
      window.removeEventListener("nova:layout", onLayout);
      for (const ch of chapters) ch.st?.kill();
    };
  }, [dir]);

  return null;
}
