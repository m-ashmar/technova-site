/**
 * The nova star — sampled from the EXACT outline of the master logo
 * (tech_master_logo_v2_sonnet.svg, path #nova-star):
 *
 *   M 500 55  C 502 170, 558 248, 580 300
 *             C 558 352, 502 430, 500 545
 *             C 498 430, 442 352, 420 300
 *             C 442 248, 498 170, 500 55 Z
 *
 * Normalized to a centered space where the vertical half-span = 1.0
 * (star is 2.0 units tall, ~0.65 wide) and +y points up (GL convention).
 */

type Pt = [number, number];

const SEGS: [Pt, Pt, Pt, Pt][] = [
  [[500, 55], [502, 170], [558, 248], [580, 300]],
  [[580, 300], [558, 352], [502, 430], [500, 545]],
  [[500, 545], [498, 430], [442, 352], [420, 300]],
  [[420, 300], [442, 248], [498, 170], [500, 55]],
];

const CX = 500;
const CY = 300;
const R = 245;

/** Same outline shifted into a `0 0 160 490` viewBox, for inline SVG glyphs. */
export const STAR_GLYPH_PATH =
  "M 80 0 C 82 115, 138 193, 160 245 C 138 297, 82 375, 80 490 C 78 375, 22 297, 0 245 C 22 193, 78 115, 80 0 Z";
export const STAR_GLYPH_VIEWBOX = "0 0 160 490";

function cubic(seg: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  const [p0, p1, p2, p3] = seg;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

function outline(steps = 48): Pt[] {
  const pts: Pt[] = [];
  for (const seg of SEGS) {
    for (let i = 1; i <= steps; i++) {
      const [x, y] = cubic(seg, i / steps);
      pts.push([(x - CX) / R, (CY - y) / R]);
    }
  }
  return pts;
}

function inside(x: number, y: number, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      hit = !hit;
    }
  }
  return hit;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StarSamples {
  /** where each particle belongs once the star is formed */
  targets: Float32Array;
  /** where each particle starts (pre-birth dust shell) */
  scatters: Float32Array;
  seeds: Float32Array;
  /** 0 = star body (metallic), 1 = lens-flare streak (nova blue) */
  kinds: Float32Array;
}

export function buildStarSamples(count: number, seed = 20260803): StarSamples {
  const rng = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };

  const poly = outline();
  const targets = new Float32Array(count * 3);
  const scatters = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const kinds = new Float32Array(count);

  const nFlare = Math.floor(count * 0.15);
  const nCore = Math.floor(count * 0.22);

  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let z = 0;
    let kind = 0;

    if (i < nFlare) {
      // The horizontal blue lens-flare streak from the master logo.
      kind = 1;
      const s = rng() < 0.5 ? -1 : 1;
      x = s * Math.pow(rng(), 0.62) * 1.5;
      const fall = 1 - (Math.min(1, Math.abs(x) / 1.5) * 0.55);
      y = gauss() * 0.016 * fall;
      z = gauss() * 0.01;
    } else if (i < nFlare + nCore) {
      // Hot cluster at the star's heart.
      for (let tries = 0; tries < 24; tries++) {
        x = gauss() * 0.1;
        y = gauss() * 0.17;
        if (inside(x, y, poly)) break;
      }
      if (!inside(x, y, poly)) {
        x = 0;
        y = 0;
      }
      z = gauss() * 0.05;
    } else {
      // Even fill of the star body.
      let ok = false;
      for (let tries = 0; tries < 60; tries++) {
        x = (rng() * 2 - 1) * 0.34;
        y = (rng() * 2 - 1) * 1.005;
        if (inside(x, y, poly)) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        x = 0;
        y = (rng() * 2 - 1) * 0.9;
      }
      const r = Math.min(1, Math.hypot(x * 2.4, y));
      z = gauss() * 0.045 * (1.15 - r);
    }

    targets[i * 3] = x;
    targets[i * 3 + 1] = y;
    targets[i * 3 + 2] = z;

    // Pre-birth dust: a wide, slightly flattened shell around the stage.
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    const rad = 1.9 + rng() * 1.6;
    scatters[i * 3] = rad * Math.sin(ph) * Math.cos(th);
    scatters[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th) * 0.8;
    scatters[i * 3 + 2] = rad * Math.cos(ph) * 0.6;

    seeds[i] = rng();
    kinds[i] = kind;
  }

  return { targets, scatters, seeds, kinds };
}
