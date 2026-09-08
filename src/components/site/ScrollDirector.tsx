"use client";

import { useEffect } from "react";
import { heroAnchor, novaState, NOVA_LAYOUT_EVENT } from "@/lib/novaState";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Drives the organism through the scroll journey:
 *
 *   hero       star, centered, full size — HELD, untouched, for the whole hero
 *   #work      -> phone, tucked to the side, small (then per-act parking)
 *   #services  -> neural web, other side
 *   #about     -> neural web drifts to the end columns
 *   #signature -> the wordmark (TECHNOVA / تكنوفا), centered
 *   #contact   wordmark settles small under the invitation, beside NOVA
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

type Pose = {
  morph: number;
  offX: number;
  offY: number;
  zoom: number;
  idle: number;
};
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

    // Acts (#act-1 … #act-5) are optional selectors: an act that is not in
    // the DOM resolves to null below and is skipped by apply().
    const chapters: Chapter[] = [
      {
        sel: "#work",
        // late start: the hero keeps its star whole and centred. offY is set
        // explicitly so a hash landing (measured mid-scroll) cannot park the
        // organism off-screen.
        start: 0.45,
        end: -0.15,
        vars: {
          morph: 1,
          offX: 0.62 * side,
          offY: 0.05,
          zoom: 0.55,
          idle: 0.65,
        },
      },
      // Per-act parking (design-system §5): media-end, media-start, theatre,
      // spec, phones — the organism takes whichever column the act leaves
      // empty, and rises above the text-only media (spec rows, feature list).
      {
        sel: "#act-1",
        start: 0.7,
        end: 0.2,
        vars: { offX: 0.62 * side, offY: 0.05, zoom: 0.55 },
      },
      {
        sel: "#act-2",
        start: 0.7,
        end: 0.2,
        vars: { offX: -0.62 * side, offY: 0.05, zoom: 0.55 },
      },
      {
        sel: "#act-3",
        start: 0.7,
        end: 0.2,
        vars: { offX: 0.55 * side, offY: 0.1, zoom: 0.6 },
      },
      {
        sel: "#act-4",
        start: 0.7,
        end: 0.2,
        vars: { offX: 0.62 * side, offY: 0.42, zoom: 0.45 },
      },
      {
        sel: "#act-5",
        start: 0.7,
        end: 0.2,
        vars: { offX: 0.62 * side, offY: 0.42, zoom: 0.45 },
      },
      {
        sel: "#services",
        start: 0.75,
        end: 0.25,
        vars: { morph: 2, offX: -0.62 * side, offY: 0, zoom: 0.5, idle: 0.65 },
      },
      {
        // Studio keeps its content in cols 1–8; the graph owns the end columns
        sel: "#about",
        start: 0.75,
        end: 0.25,
        vars: { morph: 2, offX: 0.66 * side, offY: 0, zoom: 0.55, idle: 0.8 },
      },
      {
        sel: "#signature",
        start: 0.8,
        end: 0.3,
        vars: { morph: 3, offX: 0, offY: 0.06, zoom: 0.85, idle: 1 },
      },
      {
        // the wordmark signs off under the invitation, beside the terminal,
        // where no text can ever scroll under it
        sel: "#contact",
        start: 0.75,
        end: 0.25,
        vars: { offX: -0.42 * side, offY: -0.27, zoom: 0.45, idle: 0.7 },
      },
    ];

    const els = chapters.map((c) => document.querySelector(c.sel));

    // Below md the page is one column and no column is ever empty, so the
    // organism becomes a small companion parked under the nav at the inline
    // end instead of running behind the text. The morph chain is unchanged;
    // only where it sits. The signature keeps its full centred pose.
    const narrow = window.matchMedia("(max-width: 47.9rem)");
    const MOBILE_PARK: Partial<Pose> = {
      offX: 0.62 * side,
      offY: 0.6,
      zoom: 0.2,
    };

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
        const vars =
          narrow.matches && ch.sel !== "#signature"
            ? { ...ch.vars, ...MOBILE_PARK }
            : ch.vars;
        for (const key of Object.keys(vars) as (keyof Pose)[]) {
          const target = vars[key];
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
