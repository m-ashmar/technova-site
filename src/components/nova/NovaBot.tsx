import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";
import styles from "./NovaBot.module.css";

export type BotMood = "idle" | "listening" | "thinking" | "happy";

/**
 * NOVA's face: a 56px inline SVG, decorative only (the chat carries the
 * meaning). Geometric on purpose, built from the same tokens as the rest of
 * the terminal, and topped with the brand star from the master logo.
 * Every animation lives in NovaBot.module.css behind
 * prefers-reduced-motion: no-preference; without it this is the static
 * idle pose.
 */
export default function NovaBot({ mood = "idle" }: { mood?: BotMood }) {
  return (
    <svg
      viewBox="0 0 56 56"
      width="56"
      height="56"
      className={`${styles.bot} ${styles[mood]}`}
      aria-hidden
      focusable="false"
    >
      <g className={styles.body}>
        {/* antenna + brand star, ~10px tall */}
        <line
          x1="28"
          y1="18"
          x2="28"
          y2="12"
          stroke="var(--color-ink-soft)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <g className={styles.star}>
          <svg
            viewBox={STAR_GLYPH_VIEWBOX}
            x="23"
            y="1"
            width="10"
            height="10"
          >
            <path d={STAR_GLYPH_PATH} fill="var(--color-nova-soft)" />
          </svg>
        </g>

        {/* ears */}
        <rect
          x="6.5"
          y="29"
          width="3"
          height="8"
          rx="1"
          fill="var(--color-ink-soft)"
          opacity="0.55"
        />
        <rect
          x="46.5"
          y="29"
          width="3"
          height="8"
          rx="1"
          fill="var(--color-ink-soft)"
          opacity="0.55"
        />

        {/* head */}
        <rect
          x="10"
          y="18"
          width="36"
          height="30"
          rx="9"
          fill="var(--color-surface)"
          stroke="var(--color-ink-soft)"
          strokeWidth="1.5"
        />

        {/* visor band */}
        <rect
          x="15"
          y="26"
          width="26"
          height="13"
          rx="4"
          fill="var(--color-line-strong)"
        />

        {/* eyes: rounded rects, and the arcs they crossfade to when happy */}
        <g className={styles.eyes}>
          <rect
            className={styles.eye}
            x="19"
            y="29.5"
            width="5"
            height="6"
            rx="1.5"
            fill="var(--color-nova-soft)"
          />
          <rect
            className={styles.eye}
            x="32"
            y="29.5"
            width="5"
            height="6"
            rx="1.5"
            fill="var(--color-nova-soft)"
          />
          <path
            className={styles.arc}
            d="M18.5 34 Q21.5 29 24.5 34"
            fill="none"
            stroke="var(--color-nova-soft)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className={styles.arc}
            d="M31.5 34 Q34.5 29 37.5 34"
            fill="none"
            stroke="var(--color-nova-soft)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
