"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";
import styles from "./NovaBot.module.css";

export type BotMood = "idle" | "listening" | "thinking" | "happy";

type Gesture = "wave" | "look" | "tilt" | "blink2" | "spin" | "hop" | "roll";

interface NovaBotProps {
  mood?: BotMood;
  /** Captions NOVA types above the rule: lines[0] on landing, the rest cycled. */
  lines?: string[];
  /** Whether NOVA plays idle gestures and captions on its own. */
  chatter?: boolean;
}

const GESTURES: readonly Gesture[] = [
  "wave",
  "look",
  "tilt",
  "blink2",
  "spin",
  "hop",
  "roll",
];

/** Gesture lengths, mirrored in NovaBot.module.css; used as the fallback. */
const GESTURE_MS: Record<Gesture, number> = {
  wave: 1600,
  look: 1400,
  tilt: 1200,
  blink2: 600,
  spin: 1000,
  hop: 900,
  roll: 1100,
};

const GESTURE_CLASS: Record<Gesture, string> = {
  wave: styles["g-wave"],
  look: styles["g-look"],
  tilt: styles["g-tilt"],
  blink2: styles["g-blink2"],
  spin: styles["g-spin"],
  hop: styles["g-hop"],
  roll: styles["g-roll"],
};

const ARRIVE_MS = 1600;
const TYPE_MS = 45;
const HOLD_MS = 3500;
const GAP_MIN_MS = 8000;
const GAP_SPREAD_MS = 6000;
const LOOK_MAX = 2.5;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const NO_HOVER = "(hover: none)";

/** Six spark seats around the body; --a is the angle each flies out along. */
const SPARKS: ReadonlyArray<{ x: number; y: number; a: number }> = [
  { x: 41.5, y: 29.5, a: 30 },
  { x: 51, y: 46, a: 90 },
  { x: 41.5, y: 62.5, a: 150 },
  { x: 22.5, y: 62.5, a: 210 },
  { x: 13, y: 46, a: 270 },
  { x: 22.5, y: 29.5, a: 330 },
];

interface GestureRun {
  name: Gesture;
  el: Element;
  timer: number;
  onEnd: (e: Event) => void;
}

/**
 * NOVA in person: a small flying courier that lives above the terminal's top
 * rule. It flies in from beyond the inline-end edge the first time the chat
 * scrolls into view, hovers on its thruster, follows the pointer with its
 * eyes, and every so often waves, hops, rolls or types a line of caption.
 * Decorative only; the chat carries the meaning.
 *
 * Every motion runs on transform and opacity, lives in NovaBot.module.css
 * behind prefers-reduced-motion: no-preference, and is driven from here by
 * classes toggled straight on the DOM so nothing re-renders the chat. Without
 * motion the flyer sits in place with the mood as a still pose.
 */
export default function NovaBot({
  mood = "idle",
  lines = [],
  chatter = true,
}: NovaBotProps) {
  const filterId = `nova-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const stageRef = useRef<HTMLDivElement>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const gestRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const lidsRef = useRef<SVGGElement>(null);
  const armRef = useRef<SVGGElement>(null);
  const starRef = useRef<SVGGElement>(null);

  const [caption, setCaption] = useState("");
  const [landed, setLanded] = useState(false);

  // Timers that survive a render, so unmount can clear every one of them.
  const timersRef = useRef<Set<number>>(new Set());
  const typingRef = useRef<number | null>(null);
  const gestureRef = useRef<GestureRun | null>(null);
  const linesRef = useRef(lines);
  const lineIxRef = useRef(1);
  const lastGestureRef = useRef<Gesture | null>(null);
  const rollCooldownRef = useRef(0);
  const gestureCountRef = useRef(0);

  useEffect(() => {
    linesRef.current = lines;
  });

  const later = useCallback((fn: () => void, ms: number) => {
    const timers = timersRef.current;
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }, []);

  const cancel = useCallback((id: number | null) => {
    if (id === null) return;
    window.clearTimeout(id);
    timersRef.current.delete(id);
  }, []);

  const clearGesture = useCallback(() => {
    const run = gestureRef.current;
    if (!run) return;
    gestureRef.current = null;
    cancel(run.timer);
    run.el.removeEventListener("animationend", run.onEnd);
    flyerRef.current?.classList.remove(GESTURE_CLASS[run.name]);
  }, [cancel]);

  const playGesture = useCallback(
    (name: Gesture) => {
      const flyer = flyerRef.current;
      if (!flyer) return;
      clearGesture();
      const el =
        name === "wave"
          ? armRef.current
          : name === "look"
            ? eyesRef.current
            : name === "blink2"
              ? lidsRef.current
              : name === "spin"
                ? starRef.current
                : gestRef.current;
      if (!el) return;
      const run: GestureRun = { name, el, timer: 0, onEnd: () => {} };
      run.onEnd = (e: Event) => {
        if (e.target === el && gestureRef.current === run) clearGesture();
      };
      el.addEventListener("animationend", run.onEnd);
      run.timer = later(() => {
        if (gestureRef.current === run) clearGesture();
      }, GESTURE_MS[name] + 150);
      gestureRef.current = run;
      flyer.classList.add(GESTURE_CLASS[name]);
    },
    [clearGesture, later],
  );

  const stopTyping = useCallback(() => {
    cancel(typingRef.current);
    typingRef.current = null;
  }, [cancel]);

  const typeLine = useCallback(
    (text: string) => {
      stopTyping();
      if (!text) return;
      const step = (i: number) => {
        typingRef.current = later(() => {
          setCaption(text.slice(0, i));
          if (i < text.length) {
            step(i + 1);
            return;
          }
          typingRef.current = later(() => {
            typingRef.current = null;
            setCaption("");
          }, HOLD_MS);
        }, TYPE_MS);
      };
      step(1);
    },
    [later, stopTyping],
  );

  // Unmount: every pending timer goes.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    };
  }, []);

  // Arrival: the flyer waits unseen until the stage scrolls in, then flies in
  // along a path measured from the stage's width and lands at inline-start.
  useEffect(() => {
    const stage = stageRef.current;
    const flyer = flyerRef.current;
    if (!stage || !flyer) return;
    if (window.matchMedia(REDUCED_MOTION).matches) return;

    let done = false;
    const onEnd = (e: Event) => {
      if (e.target === flyer) land();
    };
    const land = () => {
      if (done) return;
      done = true;
      flyer.removeEventListener("animationend", onEnd);
      flyer.classList.remove(styles.fly);
      flyer.classList.add(styles.in);
      later(() => {
        playGesture("wave");
        const first = linesRef.current[0];
        if (first) typeLine(first);
      }, 700);
      setLanded(true);
    };
    const launch = () => {
      const w = stage.clientWidth || 420;
      const c1 = Math.round(w * 0.55);
      const c2 = Math.round(w * 0.15);
      flyer.style.setProperty(
        "--fly-path",
        `path("M ${w + 40} 10 C ${c1} -16, ${c2} 52, 32 40")`,
      );
      flyer.style.setProperty("--fly-dx", `${w + 40}px`);
      flyer.addEventListener("animationend", onEnd);
      flyer.classList.add(styles.fly);
      later(land, ARRIVE_MS + 300);
    };

    if (typeof IntersectionObserver === "undefined") {
      launch();
      return () => flyer.removeEventListener("animationend", onEnd);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          launch();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(stage);
    return () => {
      io.disconnect();
      flyer.removeEventListener("animationend", onEnd);
    };
  }, [later, playGesture, typeLine]);

  // Eyes follow the pointer: one rAF per move, the flyer's centre read once per
  // frame, eased in CSS. Touch devices get the periodic "look" gesture instead.
  useEffect(() => {
    if (!landed) return;
    if (window.matchMedia(NO_HOVER).matches) return;
    const eyes = eyesRef.current;
    const flyer = flyerRef.current;
    const stage = stageRef.current;
    if (!eyes || !flyer || !stage) return;

    let raf = 0;
    let still = 0;
    let px = 0;
    let py = 0;
    const set = (x: number, y: number) => {
      eyes.style.setProperty("--look-x", `${x.toFixed(2)}px`);
      eyes.style.setProperty("--look-y", `${y.toFixed(2)}px`);
    };
    const rest = () => set(0, 0);
    const frame = () => {
      raf = 0;
      const r = flyer.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d < 1) {
        rest();
        return;
      }
      const m = Math.min(LOOK_MAX, d / 40);
      // The track is mirrored in RTL, so a physical "right" is a local "left".
      const rtl = stage.closest("[dir]")?.getAttribute("dir") === "rtl";
      set((dx / d) * m * (rtl ? -1 : 1), (dy / d) * m);
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(frame);
      window.clearTimeout(still);
      still = window.setTimeout(rest, 3000);
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) rest();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onOut);
    window.addEventListener("blur", rest);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", rest);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(still);
      rest();
    };
  }, [landed]);

  // Happy: one roll; the sparks and the arcs follow from CSS.
  useEffect(() => {
    if (landed && mood === "happy") playGesture("roll");
  }, [landed, mood, playGesture]);

  // The scheduler: one timeout chain, alive only while idle with chatter on,
  // paused while the tab is hidden. Leaving idle clears gesture and caption.
  useEffect(() => {
    if (!landed || !chatter || mood !== "idle") return;
    const touch = window.matchMedia(NO_HOVER).matches;
    let timer = 0;

    const tick = () => {
      if (document.visibilityState !== "visible") {
        timer = later(tick, 2000);
        return;
      }
      const pool = GESTURES.filter(
        (g) =>
          g !== lastGestureRef.current &&
          (g !== "roll" || rollCooldownRef.current === 0),
      );
      if (touch && lastGestureRef.current !== "look") pool.push("look");
      const g = pool[Math.floor(Math.random() * pool.length)] ?? "blink2";
      lastGestureRef.current = g;
      rollCooldownRef.current =
        g === "roll" ? 3 : Math.max(0, rollCooldownRef.current - 1);
      playGesture(g);

      gestureCountRef.current += 1;
      if (gestureCountRef.current % 2 === 0) {
        const all = linesRef.current;
        if (all.length > 0) {
          let ix = lineIxRef.current;
          if (ix >= all.length) ix = all.length > 1 ? 1 : 0;
          const line = all[ix];
          if (line) typeLine(line);
          lineIxRef.current = ix + 1;
        }
      }
      timer = later(tick, GAP_MIN_MS + Math.random() * GAP_SPREAD_MS);
    };

    timer = later(tick, GAP_MIN_MS + Math.random() * GAP_SPREAD_MS);
    return () => {
      cancel(timer);
      clearGesture();
      stopTyping();
      setCaption("");
    };
  }, [
    landed,
    chatter,
    mood,
    later,
    cancel,
    clearGesture,
    stopTyping,
    playGesture,
    typeLine,
  ]);

  const shown = mood === "idle" ? caption : "";

  return (
    <div ref={stageRef} className={styles.stage} aria-hidden>
      <div className={styles.track}>
        <div ref={flyerRef} className={`${styles.flyer} ${styles[mood]}`}>
          <div className={styles.drift}>
            <div className={styles.bob}>
              <div ref={gestRef} className={styles.gest}>
                <svg
                  viewBox="0 0 64 72"
                  width="64"
                  height="72"
                  className={styles.svg}
                  focusable="false"
                >
                  <defs>
                    <filter
                      id={filterId}
                      x="-50%"
                      y="-100%"
                      width="200%"
                      height="300%"
                    >
                      <feGaussianBlur stdDeviation="2" />
                    </filter>
                  </defs>

                  {/* thruster: a blurred glow under the torso and its hot core */}
                  <g className={styles.thruster}>
                    <ellipse
                      className={styles.glow}
                      cx="32"
                      cy="67"
                      rx="9"
                      ry="3.2"
                      fill="var(--color-nova-soft)"
                      filter={`url(#${filterId})`}
                    />
                    <ellipse
                      cx="32"
                      cy="66"
                      rx="3.5"
                      ry="1.4"
                      fill="var(--color-nova)"
                    />
                  </g>

                  {/* antenna + brand star, ~10px tall */}
                  <line
                    x1="32"
                    y1="18"
                    x2="32"
                    y2="13"
                    stroke="var(--color-ink-soft)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <g ref={starRef} className={styles.star}>
                    <svg
                      viewBox={STAR_GLYPH_VIEWBOX}
                      x="27"
                      y="4"
                      width="10"
                      height="10"
                    >
                      <path d={STAR_GLYPH_PATH} fill="var(--color-nova-soft)" />
                    </svg>
                  </g>

                  {/* ears */}
                  <rect
                    x="11.5"
                    y="28"
                    width="3"
                    height="8"
                    rx="1"
                    fill="var(--color-ink-soft)"
                    opacity="0.55"
                  />
                  <rect
                    x="49.5"
                    y="28"
                    width="3"
                    height="8"
                    rx="1"
                    fill="var(--color-ink-soft)"
                    opacity="0.55"
                  />

                  {/* head */}
                  <rect
                    x="15"
                    y="18"
                    width="34"
                    height="26"
                    rx="8"
                    fill="var(--color-surface)"
                    stroke="var(--color-ink-soft)"
                    strokeWidth="1.5"
                  />

                  {/* visor band */}
                  <rect
                    x="20"
                    y="25"
                    width="24"
                    height="12"
                    rx="4"
                    fill="var(--color-line-strong)"
                  />

                  {/* eyes: the group looks around, the lids blink, and the arcs
                      crossfade in when happy */}
                  <g ref={eyesRef} className={styles.eyes}>
                    <g ref={lidsRef} className={styles.lids}>
                      <rect
                        className={styles.eye}
                        x="23.5"
                        y="28"
                        width="5"
                        height="6"
                        rx="1.5"
                        fill="var(--color-nova-soft)"
                      />
                      <rect
                        className={styles.eye}
                        x="35.5"
                        y="28"
                        width="5"
                        height="6"
                        rx="1.5"
                        fill="var(--color-nova-soft)"
                      />
                    </g>
                    <path
                      className={styles.arc}
                      d="M23 33.5 Q26 28.5 29 33.5"
                      fill="none"
                      stroke="var(--color-nova-soft)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      className={styles.arc}
                      d="M35 33.5 Q38 28.5 41 33.5"
                      fill="none"
                      stroke="var(--color-nova-soft)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* neck */}
                  <rect
                    x="29"
                    y="44"
                    width="6"
                    height="4"
                    fill="var(--color-ink-soft)"
                    opacity="0.55"
                  />

                  {/* shoulders, the arms' first joint */}
                  <rect
                    x="13"
                    y="51"
                    width="5"
                    height="6"
                    rx="2"
                    fill="var(--color-ink-soft)"
                    opacity="0.55"
                  />
                  <rect
                    x="46"
                    y="51"
                    width="5"
                    height="6"
                    rx="2"
                    fill="var(--color-ink-soft)"
                    opacity="0.55"
                  />

                  {/* torso and chest core */}
                  <rect
                    x="18"
                    y="48"
                    width="28"
                    height="16"
                    rx="6"
                    fill="var(--color-surface)"
                    stroke="var(--color-ink-soft)"
                    strokeWidth="1.5"
                  />
                  <circle
                    className={styles.core}
                    cx="32"
                    cy="55"
                    r="3"
                    fill="var(--color-nova-soft)"
                  />

                  {/* inline-end arm, hinged at the shoulder, resting down */}
                  <g ref={armRef} className={styles.arm}>
                    <line
                      x1="48.5"
                      y1="53"
                      x2="48.5"
                      y2="62"
                      stroke="var(--color-ink-soft)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.55"
                    />
                    <circle
                      cx="48.5"
                      cy="64.5"
                      r="2.5"
                      fill="var(--color-ink-soft)"
                      opacity="0.55"
                    />
                  </g>

                  {/* sparks for the happy burst, hidden until then */}
                  <g>
                    {SPARKS.map((s) => (
                      <g
                        key={s.a}
                        className={styles.spark}
                        style={{ "--a": `${s.a}deg` } as CSSProperties}
                      >
                        <svg
                          viewBox={STAR_GLYPH_VIEWBOX}
                          x={s.x - 2}
                          y={s.y - 2}
                          width="4"
                          height="4"
                        >
                          <path d={STAR_GLYPH_PATH} fill="var(--color-nova)" />
                        </svg>
                      </g>
                    ))}
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {shown ? (
        <p className={styles.say}>
          {shown}
          <span className={styles.caret} />
        </p>
      ) : null}
    </div>
  );
}
