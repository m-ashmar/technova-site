import { STAR_GLYPH_PATH } from "@/lib/star";

/**
 * The four brand values, drawn in the same line language as the brand sheet's
 * value row (idea / ascent / shelter / together). Unknown or missing icon
 * names fall back to the nova star, so adding a fifth value never breaks.
 */

export type ValueIconName =
  | "innovation"
  | "excellence"
  | "reliability"
  | "partnership";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const GLYPHS: Record<ValueIconName, React.ReactNode> = {
  // lamp: an idea coming on
  innovation: (
    <>
      <path
        {...stroke}
        d="M16,19.5 a8,8 0 1 1 12.4,6.65 V29 a1.6,1.6 0 0 1-1.6,1.6 h-5.6 A1.6,1.6 0 0 1 19.6,29 v-2.85 A8,8 0 0 1 16,19.5 Z"
      />
      <path {...stroke} d="M20.4,34 h7.2" />
      <path {...stroke} d="M21.6,37 h4.8" />
      <path {...stroke} className="text-nova" d="M24,15.5 v5" />
    </>
  ),
  // ascent: a rise with thrust
  excellence: (
    <>
      <path
        {...stroke}
        d="M24,7 c4.4,4.2 6.6,9.4 6.6,15.2 0,3.4-.9,6.6-2.4,9.2 h-8.4 c-1.5-2.6-2.4-5.8-2.4-9.2 C17.4,16.4 19.6,11.2 24,7 Z"
      />
      <path {...stroke} d="M17.6,25.4 L13.4,30 v5.4 l4.6-3" />
      <path {...stroke} d="M30.4,25.4 L34.6,30 v5.4 l-4.6-3" />
      <path {...stroke} className="text-nova" d="M22,37.5 c1,2 3,2 4,0" />
      <circle cx={24} cy={19} r={2.6} {...stroke} />
    </>
  ),
  // shelter: something dependable held over you
  reliability: (
    <>
      <path
        {...stroke}
        d="M24,7.5 L37,12.5 v10.2 c0,8.1-5.4,14.2-13,17.3 -7.6-3.1-13-9.2-13-17.3 V12.5 Z"
      />
      <path {...stroke} className="text-nova" d="M18.5,23.8 L22.6,28 L30,20.2" />
    </>
  ),
  // together: two figures, shared ground
  partnership: (
    <>
      <circle cx={18} cy={17} r={4.4} {...stroke} />
      <circle cx={31} cy={19.5} r={3.6} {...stroke} />
      <path {...stroke} d="M9.5,33.5 c0-4.7 3.8-8.5 8.5-8.5 s8.5,3.8 8.5,8.5" />
      <path
        {...stroke}
        className="text-nova"
        d="M29,26.2 c4.3,.4 7.6,4 7.6,8.4"
      />
    </>
  ),
};

export default function ValueIcon({ name }: { name?: string }) {
  const glyph =
    name && name in GLYPHS ? GLYPHS[name as ValueIconName] : null;

  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 text-nova-soft" aria-hidden>
      {glyph ?? (
        <g transform="translate(20.7,14) scale(0.0408)">
          <path d={STAR_GLYPH_PATH} fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
