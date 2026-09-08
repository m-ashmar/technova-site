"use client";

import { useEffect, useRef } from "react";
import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";
import styles from "./NovaBot.module.css";

export type BotMood = "idle" | "listening" | "thinking" | "happy";

/**
 * NOVA in person: head, shoulders and the top of a torso, perched behind the
 * terminal's top rule and rising into view the first time the chat scrolls
 * in, as if it had been waiting under the counter. Decorative only; the chat
 * carries the meaning. Geometric on purpose, built from the same tokens as the
 * rest of the terminal, topped with the brand star from the master logo.
 * Every animation lives in NovaBot.module.css behind
 * prefers-reduced-motion: no-preference; without it this is the still pose,
 * already in place.
 */
export default function NovaBot({ mood = "idle" }: { mood?: BotMood }) {
  const perchRef = useRef<HTMLDivElement>(null);

  // The rise is a one-shot class on the perch, added straight on the DOM so
  // the reveal never re-renders the chat that owns this component.
  useEffect(() => {
    const el = perchRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add(styles.in);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add(styles.in);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={perchRef} className={styles.perch} aria-hidden>
      <svg
        viewBox="0 0 64 64"
        width="64"
        height="64"
        className={`${styles.bot} ${styles[mood]}`}
        focusable="false"
      >
        <g className={styles.body}>
          {/* antenna + brand star, ~10px tall */}
          <line
            x1="32"
            y1="14"
            x2="32"
            y2="9"
            stroke="var(--color-ink-soft)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <g className={styles.star}>
            <svg viewBox={STAR_GLYPH_VIEWBOX} x="27" y="0" width="10" height="10">
              <path d={STAR_GLYPH_PATH} fill="var(--color-nova-soft)" />
            </svg>
          </g>

          {/* ears */}
          <rect
            x="11.5"
            y="24"
            width="3"
            height="8"
            rx="1"
            fill="var(--color-ink-soft)"
            opacity="0.55"
          />
          <rect
            x="49.5"
            y="24"
            width="3"
            height="8"
            rx="1"
            fill="var(--color-ink-soft)"
            opacity="0.55"
          />

          {/* head */}
          <rect
            x="15"
            y="14"
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
            y="21"
            width="24"
            height="12"
            rx="4"
            fill="var(--color-line-strong)"
          />

          {/* eyes: rounded rects, and the arcs they crossfade to when happy */}
          <g className={styles.eyes}>
            <rect
              className={styles.eye}
              x="23.5"
              y="24"
              width="5"
              height="6"
              rx="1.5"
              fill="var(--color-nova-soft)"
            />
            <rect
              className={styles.eye}
              x="35.5"
              y="24"
              width="5"
              height="6"
              rx="1.5"
              fill="var(--color-nova-soft)"
            />
            <path
              className={styles.arc}
              d="M23 29.5 Q26 24.5 29 29.5"
              fill="none"
              stroke="var(--color-nova-soft)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              className={styles.arc}
              d="M35 29.5 Q38 24.5 41 29.5"
              fill="none"
              stroke="var(--color-nova-soft)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* neck */}
          <rect
            x="29"
            y="40"
            width="6"
            height="4"
            fill="var(--color-ink-soft)"
            opacity="0.55"
          />

          {/* shoulders, the arms' first joint */}
          <rect
            x="13"
            y="47"
            width="5"
            height="10"
            rx="2"
            fill="var(--color-ink-soft)"
            opacity="0.55"
          />
          <rect
            x="46"
            y="47"
            width="5"
            height="10"
            rx="2"
            fill="var(--color-ink-soft)"
            opacity="0.55"
          />

          {/* torso: its lower half stays behind the rule */}
          <rect
            x="18"
            y="44"
            width="28"
            height="24"
            rx="7"
            fill="var(--color-surface)"
            stroke="var(--color-ink-soft)"
            strokeWidth="1.5"
          />
          <circle
            className={styles.core}
            cx="32"
            cy="52"
            r="3"
            fill="var(--color-nova-soft)"
          />
        </g>
      </svg>
    </div>
  );
}
