"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import BootConsole from "./BootConsole";
import {
  heroAnchor,
  novaState,
  NOVA_LAYOUT_EVENT,
  NOVA_LIVE_EVENT,
} from "@/lib/novaState";
import {
  webglSupported,
  SCENE_FAILED_EVENT,
  SCENE_READY_EVENT,
} from "@/lib/webgl";
import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";
import { useApp } from "@/components/providers/AppProvider";

type Stage = "init" | "boot" | "birth" | "live";

const SEEN_KEY = "nova-ignited";

/**
 * Master-logo geometry (tech_master_logo_v2_sonnet.svg): the star spans 490
 * units tall while the letters' cap height is 64 — the star stands ~7.66x the
 * caps. Orbitron's cap height is ~0.7 of its font size, so the star's half
 * span should be ~2.68x the letter font size for the hero to reproduce the
 * brand sheet exactly.
 */
const STAR_HALF_SPAN_PER_FONT_PX = (490 / 64) * 0.7 * 0.5;

export default function IgnitionHero() {
  const { t } = useApp();
  const [stage, setStage] = useState<Stage>("init");
  const flashRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLSpanElement>(null);
  const teRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [staticStar, setStaticStar] = useState(false);
  const sceneReadyRef = useRef(false);

  // No GPU, or the scene threw: draw the logo's star as plain SVG instead.
  // The capability probe has to happen after mount, never during render, or
  // the client would disagree with the server's HTML and break hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only capability probe
    if (!webglSupported()) setStaticStar(true);
    const onFail = () => setStaticStar(true);
    const onReady = () => {
      sceneReadyRef.current = true;
    };
    window.addEventListener(SCENE_FAILED_EVENT, onFail);
    window.addEventListener(SCENE_READY_EVENT, onReady);
    return () => {
      window.removeEventListener(SCENE_FAILED_EVENT, onFail);
      window.removeEventListener(SCENE_READY_EVENT, onReady);
    };
  }, []);

  // Decide the entry path once, on the client.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const replay = new URLSearchParams(window.location.search).has("boot");
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}

    // Without a GPU there is nothing to ignite: show the finished hero.
    // Same reason as above: localStorage, matchMedia and WebGL are all
    // client-only, so the entry path can only be chosen after mount.
    const live = reduced || !webglSupported() || (seen && !replay);
    novaState.progress = live ? 1 : 0;
    novaState.bloom = 1.15;
    novaState.idle = live && reduced ? 0.35 : 1;

    // The intro is the first thing anyone sees, so it starts at the top —
    // whatever the browser restored or another component scrolled to.
    if (!live) {
      try {
        history.scrollRestoration = "manual";
      } catch {}
      window.scrollTo(0, 0);
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       client-only entry decision; reading it during render would desync
       hydration */
    setStage(live ? "live" : "boot");
  }, []);

  /**
   * Pin the star into the "TE ★ CH" gap at brand-sheet proportions. Measured
   * from the real DOM so it holds at every width, and re-measured on resize
   * and once webfonts land (Orbitron changes the letter metrics).
   */
  useLayoutEffect(() => {
    const measure = () => {
      const gap = gapRef.current;
      const te = teRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Below `sm` the letter row is hidden: the star owns the upper half,
      // sitting clear of the headline stack beneath it.
      if (!gap || !te || gap.offsetParent === null) {
        heroAnchor.x = 0;
        heroAnchor.y = 0.18;
        heroAnchor.zoom = 0.82;
      } else {
        const r = gap.getBoundingClientRect();
        heroAnchor.x = (r.left + r.width / 2 - vw / 2) / (vw / 2);
        heroAnchor.y = (vh / 2 - (r.top + r.height / 2)) / (vh / 2);

        const fontPx = parseFloat(getComputedStyle(te).fontSize) || 0;
        // NovaScene's base scale, in pixels, for the current viewport.
        const basePx = Math.min(0.36, 0.55 * (vw / vh)) * vh;
        heroAnchor.zoom =
          basePx > 0
            ? (fontPx * STAR_HALF_SPAN_PER_FONT_PX) / basePx
            : 1;
      }
      window.dispatchEvent(new Event(NOVA_LAYOUT_EVENT));
    };

    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [stage]);

  // The intro owns the viewport; release scroll when live.
  useEffect(() => {
    const lock = stage !== "live";
    document.documentElement.style.overflow = lock ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [stage]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setStage("live");
  }, []);

  // The birth: dust drifts in -> collapses -> white flash -> the star ignites.
  const ignite = useCallback(() => {
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(novaState, { progress: 0.62, duration: 1.9, ease: "power2.in" })
      .to(novaState, { bloom: 3.0, duration: 0.14, ease: "power1.in" })
      .to(flashRef.current, { opacity: 0.85, duration: 0.12, ease: "power1.in" }, "<")
      .to(novaState, { progress: 1, duration: 1.6, ease: "power3.out" }, "<")
      .to(flashRef.current, { opacity: 0, duration: 0.6, ease: "power2.out" }, "<+0.15")
      .to(novaState, { bloom: 1.15, duration: 1.4, ease: "power2.out" }, "<");
    tlRef.current = tl;
  }, [finish]);

  /**
   * The console has finished; hold it on screen until the renderer exists,
   * so a slow connection delays the birth instead of the visitor missing it.
   * Never waits longer than 8 seconds.
   */
  const beginBirth = useCallback(() => {
    const go = () => {
      setStage("birth");
      ignite();
    };
    if (sceneReadyRef.current || !webglSupported()) return go();
    const onReady = () => {
      clearTimeout(timer);
      go();
    };
    const timer = setTimeout(() => {
      window.removeEventListener(SCENE_READY_EVENT, onReady);
      go();
    }, 8000);
    window.addEventListener(SCENE_READY_EVENT, onReady, { once: true });
  }, [ignite]);

  const skip = useCallback(() => {
    tlRef.current?.kill();
    gsap.killTweensOf(novaState);
    if (flashRef.current) gsap.set(flashRef.current, { opacity: 0 });
    novaState.progress = 1;
    novaState.bloom = 1.15;
    finish();
  }, [finish]);

  /**
   * Safety net: the intro holds the scroll, so it must never be able to hang.
   * If the sequence has not finished after 14 seconds of *visible* time
   * (hidden tabs pause the show by design), force the site live.
   */
  useEffect(() => {
    if (stage !== "boot" && stage !== "birth") return;
    let visibleMs = 0;
    const id = setInterval(() => {
      if (!document.hidden) visibleMs += 500;
      if (visibleMs >= 14000) {
        clearInterval(id);
        skip();
      }
    }, 500);
    return () => clearInterval(id);
  }, [stage, skip]);

  // Reveal hero content and announce liveness (covers both entry paths).
  useEffect(() => {
    if (stage !== "live" || !contentRef.current) return;
    const els = contentRef.current.querySelectorAll("[data-reveal]");
    gsap.fromTo(
      els,
      { y: 26, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.09, ease: "power3.out" }
    );
    window.dispatchEvent(new Event(NOVA_LIVE_EVENT));
  }, [stage]);

  return (
    <section id="top" className="relative h-[100svh] min-h-[560px] overflow-hidden">
      {/* ignition flash */}
      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 z-30 bg-white opacity-0"
      />

      {/* opaque cover until the client decides boot vs. returning visitor */}
      {stage === "init" && <div className="absolute inset-0 z-40 bg-bg" />}

      {stage === "boot" && (
        <BootConsole lines={t.boot.lines} onDone={beginBirth} />
      )}

      {(stage === "boot" || stage === "birth") && (
        <button
          type="button"
          onClick={skip}
          className="absolute bottom-8 end-8 z-40 font-mono text-xs tracking-[0.25em] text-muted/80 transition hover:text-ink"
        >
          {t.boot.skip} ›
        </button>
      )}

      {/* hero content */}
      <div
        ref={contentRef}
        className="pointer-events-none absolute inset-0 z-10 grid grid-rows-[1fr_auto_1fr] px-6"
      >
        <div />

        {/* T E ★ C H — the master logo, alive: the star burns through the gap */}
        <div
          data-reveal
          dir="ltr"
          className="invisible hidden w-full grid-cols-[1fr_auto_1fr] items-center sm:grid"
        >
          <span
            ref={teRef}
            className="justify-self-end brand-mark font-display text-[clamp(3rem,9vw,6.6rem)] font-medium leading-none tracking-[0.26em] text-ink"
          >
            TE
          </span>
          {/*
            The star's slot, sized in the letters' own units so it scales with
            them at every width. The master logo puts the E and C almost
            against the star's arms — 10 units of air beside a 160-unit star —
            and 1.45x the font size reproduces exactly that: the star is 1.75x
            wide, the E's trailing letter-space gives back 0.26x, leaving a
            hair of clearance on each side.
          */}
          <span
            ref={gapRef}
            aria-hidden
            className="relative block"
            style={{ width: "calc(clamp(3rem, 9vw, 6.6rem) * 1.45)" }}
          >
            {staticStar && (
              <svg
                viewBox={STAR_GLYPH_VIEWBOX}
                className="absolute left-1/2 top-1/2 w-auto -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_30px_rgb(10_132_255/60%)]"
                style={{ height: "calc(clamp(3rem, 9vw, 6.6rem) * 5.36)" }}
              >
                <path d={STAR_GLYPH_PATH} fill="#EAF2FF" />
              </svg>
            )}
          </span>
          {/*
            `ps` matches the tracking: CSS letter-spacing trails every glyph,
            including the E, so without an equal pad before the C the star
            would sit closer to the C than to the E.
          */}
          <span className="justify-self-start ps-[0.26em] brand-mark font-display text-[clamp(3rem,9vw,6.6rem)] font-medium leading-none tracking-[0.26em] text-ink">
            CH
          </span>
        </div>

        <div className="row-start-3 flex flex-col items-center justify-end gap-5 pb-24 text-center sm:pb-20">
          <p
            data-reveal
            className="ar-tight invisible font-mono text-[11px] tracking-[0.4em] text-muted"
          >
            {t.hero.eyebrow}
          </p>
          <h1
            data-reveal
            dir="ltr"
            className="invisible brand-mark font-display text-2xl font-medium tracking-[0.5em] sm:text-3xl"
          >
            <span className="text-ink">TECH</span>
            <span className="text-glow text-nova">NOVA</span>
          </h1>
          <p
            data-reveal
            className="ar-tight invisible font-mono text-xs uppercase tracking-[0.45em] text-muted"
          >
            {t.hero.tagline}
          </p>
          <p
            data-reveal
            className="invisible max-w-xl text-sm leading-7 text-muted sm:text-base"
          >
            {t.hero.statement}
          </p>
          <div
            data-reveal
            className="pointer-events-auto invisible mt-2 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#contact"
              className="rounded-full bg-nova px-7 py-3 text-sm font-medium text-white shadow-[0_0_28px_rgb(10_132_255/45%)] transition hover:brightness-110"
            >
              {t.hero.ctaPrimary}
            </a>
            <a
              href="#work"
              className="rounded-full border border-line px-7 py-3 text-sm text-ink/90 transition hover:border-nova-soft/60 hover:text-ink"
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
        </div>
      </div>

      {/* scroll hint */}
      {stage === "live" && (
        <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2">
          <span className="ar-tight font-mono text-[10px] tracking-[0.35em] text-muted/70">
            {t.hero.scrollHint}
          </span>
          <span className="scroll-line block h-8 w-px bg-nova-soft/60" />
        </div>
      )}
    </section>
  );
}
