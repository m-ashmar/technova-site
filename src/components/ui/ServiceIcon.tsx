import { STAR_GLYPH_PATH } from "@/lib/star";

/**
 * Line-art glyphs for the four capabilities, drawn in the brand's own
 * language: thin strokes, one nova-blue accent, and the four-pointed star
 * reserved for the intelligence icon. Every stroked path carries
 * `pathLength="1"` and `data-draw` so the CSS can draw it on reveal.
 */

type Props = {
  icon: "ai" | "apps" | "web" | "auto";
  /** Rendered box in px. The glyph is drawn on a 48-unit grid; 44 is the legacy card size. */
  size?: number;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Ai() {
  const nodes: [number, number][] = [
    [9, 13],
    [39, 13],
    [9, 35],
    [39, 35],
  ];
  return (
    <>
      {nodes.map(([x, y], i) => (
        <path
          key={`l${i}`}
          {...stroke}
          pathLength={1}
          data-draw
          d={`M${x},${y} L${x < 24 ? 19.5 : 28.5},${y < 24 ? 20 : 28}`}
        />
      ))}
      <path {...stroke} pathLength={1} data-draw d="M9,13 V35" />
      <path {...stroke} pathLength={1} data-draw d="M39,13 V35" />
      {nodes.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r={2} fill="currentColor" data-fade />
      ))}
      <g
        data-fade
        className="text-nova"
        transform="translate(20.7,14) scale(0.0408)"
      >
        <path d={STAR_GLYPH_PATH} fill="currentColor" />
      </g>
    </>
  );
}

function Apps() {
  return (
    <>
      <path
        {...stroke}
        pathLength={1}
        data-draw
        d="M8.5,14 H15.5 A2.5,2.5 0 0 1 18,16.5 V33.5 A2.5,2.5 0 0 1 15.5,36 H8.5 A2.5,2.5 0 0 1 6,33.5 V16.5 A2.5,2.5 0 0 1 8.5,14 Z"
      />
      <path
        {...stroke}
        pathLength={1}
        data-draw
        d="M23,8 H35 A3,3 0 0 1 38,11 V37 A3,3 0 0 1 35,40 H23 A3,3 0 0 1 20,37 V11 A3,3 0 0 1 23,8 Z"
      />
      <path {...stroke} pathLength={1} data-draw d="M24,18 H34" />
      <path {...stroke} pathLength={1} data-draw d="M24,23 H34" />
      <path
        {...stroke}
        pathLength={1}
        data-draw
        className="text-nova"
        d="M24,28 H30"
      />
      <circle cx={29} cy={12} r={1} fill="currentColor" data-fade />
    </>
  );
}

function Web() {
  return (
    <>
      <path
        {...stroke}
        pathLength={1}
        data-draw
        d="M8,10 H40 A2,2 0 0 1 42,12 V36 A2,2 0 0 1 40,38 H8 A2,2 0 0 1 6,36 V12 A2,2 0 0 1 8,10 Z"
      />
      <path {...stroke} pathLength={1} data-draw d="M6,17 H42" />
      <path
        {...stroke}
        pathLength={1}
        data-draw
        d="M24,20.5 A7,7 0 1 1 23.9,20.5 Z"
      />
      <path
        {...stroke}
        pathLength={1}
        data-draw
        className="text-nova"
        d="M24,20.5 A4.2,7 0 0 1 24,34.5 A4.2,7 0 0 1 24,20.5 Z"
      />
      <path {...stroke} pathLength={1} data-draw d="M17,27.5 H31" />
      {[10, 14, 18].map((x) => (
        <circle key={x} cx={x} cy={13.5} r={1} fill="currentColor" data-fade />
      ))}
    </>
  );
}

function Auto() {
  return (
    <>
      <path
        {...stroke}
        pathLength={1}
        data-draw
        d="M37,26 A13,13 0 1 1 26,11.1"
      />
      <path
        {...stroke}
        pathLength={1}
        data-draw
        className="text-nova"
        d="M22.5,8 L26.2,11.2 L23,14.6"
      />
      <path {...stroke} pathLength={1} data-draw d="M24,19 V29" />
      <path {...stroke} pathLength={1} data-draw d="M19.5,24.5 H28.5" />
      {(
        [
          [24, 19],
          [19.5, 24.5],
          [28.5, 24.5],
          [24, 29],
        ] as [number, number][]
      ).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill="currentColor" data-fade />
      ))}
    </>
  );
}

export default function ServiceIcon({ icon, size = 44 }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className="icon-draw shrink-0 text-ink/85 transition-colors duration-300 group-hover:text-ink"
      aria-hidden
    >
      {icon === "ai" && <Ai />}
      {icon === "apps" && <Apps />}
      {icon === "web" && <Web />}
      {icon === "auto" && <Auto />}
    </svg>
  );
}
