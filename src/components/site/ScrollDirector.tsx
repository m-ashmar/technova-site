"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { heroAnchor, novaState, NOVA_LAYOUT_EVENT } from "@/lib/novaState";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Drives the organism through the scroll journey:
 *
 *   hero       star, centered, full size — HELD, untouched, for the whole hero
 *   #work      -> phone, tucked to the side, small
 *   #services  -> neural web, other side
 *   #signature -> the wordmark (TECHNOVA / تكنوفا), centered
 *   #contact   wordmark floats up small above the NOVA chat
 *
 * The hero is the site's opening act: the first chapter deliberately does not
 * begin until #work has climbed to mid-screen (~60% of the hero scrolled), so
 * the newborn star is never dissolving while it is still on its own stage.
 *
 * The state is recomputed *statelessly* from every chapter's progress on each
 * scroll update — sequential lerps from the base state — so instant jumps
 * (anchor links, programmatic scrolls, reloads mid-page) always land on the
 * exact same values as gradual scrolling. Horizontal offsets mirror in RTL.
 *
 * Layout changes that move sections (e.g. opening a live embed) should
 * dispatch `nova:layout` on window so trigger positions are re-measured.
 */

type Pose = { morph: number; offX: number; offY: number; zoom: number; idle: number };
type ChapterVars = Partial<Pose>;

/** The journey's starting pose: the star parked in the hero's letter gap. */
const basePose = (): Pose => ({
  morph: 0,
  offX: heroAnchor.x,
  offY: heroAnchor.y,
  zoom: heroAnchor.zoom,
  idle: 1,
});

export default function ScrollDirector() {
  const { dir } = useApp();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (process.env.NODE_ENV === "development") {
      // verification aid, same gate as the canvas DevBridge
      (window as unknown as Record<string, unknown>).__novaState = novaState;
    }
    const side = dir === "rtl" ? -1 : 1;

    type Chapter = {
      sel: string;
      start: string;
      end: string;
      vars: ChapterVars;
      st?: ScrollTrigger;
    };

    const chapters: Chapter[] = [
      {
        sel: "#work",
        // late start: the hero keeps its star whole and centered
        start: "top 45%",
        end: "top -15%",
        vars: { morph: 1, offX: 0.58 * side, zoom: 0.55, idle: 0.65 },
      },
      {
        sel: "#services",
        start: "top 75%",
        end: "top 25%",
        vars: { morph: 2, offX: -0.58 * side, zoom: 0.5, idle: 0.65 },
      },
      {
        sel: "#signature",
        start: "top 80%",
        end: "top 30%",
        vars: { morph: 3, offX: 0, offY: 0.06, zoom: 0.85, idle: 1 },
      },
      {
        sel: "#contact",
        start: "top 75%",
        end: "top 25%",
        vars: { offY: 0.4, zoom: 0.45, idle: 0.7 },
      },
    ];

    const apply = () => {
      const s = basePose();
      for (const ch of chapters) {
        const p = ch.st?.progress ?? 0;
        if (p <= 0) continue;
        for (const key of Object.keys(ch.vars) as (keyof Pose)[]) {
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
        start: ch.start,
        end: ch.end,
        onUpdate: apply,
        onRefresh: apply,
      });
    }
    apply();

    const onLayout = () => {
      ScrollTrigger.refresh();
      apply();
    };
    window.addEventListener(NOVA_LAYOUT_EVENT, onLayout);

    return () => {
      window.removeEventListener(NOVA_LAYOUT_EVENT, onLayout);
      for (const ch of chapters) ch.st?.kill();
    };
  }, [dir]);

  return null;
}
