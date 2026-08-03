"use client";

import { useEffect } from "react";
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
 * begin until #work has climbed to mid-screen (~55% of the hero scrolled), so
 * the newborn star is never dissolving while it is still on its own stage.
 *
 * Progress is measured directly from each section's viewport position rather
 * than with a scroll plugin: the pose is then recomputed statelessly from the
 * base pose on every scroll, which makes instant jumps (anchor links, reloads
 * mid-page, the mobile menu) land on exactly the values gradual scrolling
 * would produce — and, unlike GSAP's ScrollTrigger, it measures identically
 * under `dir="rtl"`, where that plugin silently reports no progress at all.
 *
 * `start`/`end` are the section top's position as a fraction of the viewport
 * height: 0.45 means "top edge at 45% down the screen", negative means it has
 * already left the top.
 */

type Pose = { morph: number; offX: number; offY: number; zoom: number; idle: number };
type Chapter = {
  sel: string;
  start: number;
  end: number;
  vars: Partial<Pose>;
};

/** The journey's starting pose: the star parked in the hero's letter gap. */
const basePose = (): Pose => ({
  morph: 0,
  offX: heroAnchor.x,
  offY: heroAnchor.y,
  zoom: heroAnchor.zoom,
  idle: 1,
});

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function ScrollDirector() {
  const { dir } = useApp();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // verification aid, same gate as the canvas DevBridge
      (window as unknown as Record<string, unknown>).__novaState = novaState;
    }
    const side = dir === "rtl" ? -1 : 1;

    const chapters: Chapter[] = [
      {
        sel: "#work",
        // late start: the hero keeps its star whole and centred
        start: 0.45,
        end: -0.15,
        vars: { morph: 1, offX: 0.58 * side, zoom: 0.55, idle: 0.65 },
      },
      {
        sel: "#services",
        start: 0.75,
        end: 0.25,
        vars: { morph: 2, offX: -0.58 * side, zoom: 0.5, idle: 0.65 },
      },
      {
        sel: "#signature",
        start: 0.8,
        end: 0.3,
        vars: { morph: 3, offX: 0, offY: 0.06, zoom: 0.85, idle: 1 },
      },
      {
        sel: "#contact",
        start: 0.75,
        end: 0.25,
        vars: { offY: 0.4, zoom: 0.45, idle: 0.7 },
      },
    ];

    const els = chapters.map((c) => document.querySelector(c.sel));

    const apply = () => {
      const vh = window.innerHeight || 1;
      const s = basePose();
      for (let i = 0; i < chapters.length; i++) {
        const el = els[i];
        if (!el) continue;
        const ch = chapters[i];
        const top = el.getBoundingClientRect().top;
        const startPx = ch.start * vh;
        const endPx = ch.end * vh;
        const span = startPx - endPx;
        const p = span === 0 ? 0 : clamp01((startPx - top) / span);
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

    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    window.addEventListener(NOVA_LAYOUT_EVENT, apply);

    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener(NOVA_LAYOUT_EVENT, apply);
    };
  }, [dir]);

  return null;
}
