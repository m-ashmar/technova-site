import { mulberry32 } from "./star";

/**
 * Morph-target point clouds for the scroll journey. All shapes share the
 * star's coordinate convention: centered, pre-uScale local units where the
 * hero star's vertical half-span = 1.0.
 */

function gaussFactory(rng: () => number) {
  return () => {
    let u = 0;
    while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
}

/** Neural web: node clusters joined by particle-beaded edges (Services). */
export function buildWebSamples(count: number, seed = 11): Float32Array {
  const rng = mulberry32(seed);
  const gauss = gaussFactory(rng);
  const N = 26;
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 0.95;
    nodes.push([Math.cos(a) * r, Math.sin(a) * r * 0.72, (rng() - 0.5) * 0.38]);
  }
  // Each node links to its 2 nearest neighbours.
  const edges: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const d = nodes
      .map((n, j) => ({
        j,
        dist: Math.hypot(n[0] - nodes[i][0], n[1] - nodes[i][1], n[2] - nodes[i][2]),
      }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.dist - b.dist);
    for (const e of d.slice(0, 2)) {
      const key: [number, number] = [Math.min(i, e.j), Math.max(i, e.j)];
      if (!edges.some(([a, b]) => a === key[0] && b === key[1])) edges.push(key);
    }
  }
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number;
    if (rng() < 0.34) {
      const n = nodes[(rng() * N) | 0];
      x = n[0] + gauss() * 0.045;
      y = n[1] + gauss() * 0.045;
      z = n[2] + gauss() * 0.03;
    } else {
      const [a, b] = edges[(rng() * edges.length) | 0];
      const t = rng();
      x = nodes[a][0] + (nodes[b][0] - nodes[a][0]) * t + gauss() * 0.012;
      y = nodes[a][1] + (nodes[b][1] - nodes[a][1]) * t + gauss() * 0.012;
      z = nodes[a][2] + (nodes[b][2] - nodes[a][2]) * t + gauss() * 0.012;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

/** A phone: rounded-rect body, screen rows, camera dot (Work). */
export function buildPhoneSamples(count: number, seed = 17): Float32Array {
  const rng = mulberry32(seed);
  const gauss = gaussFactory(rng);
  const W = 0.62, H = 1.24, R = 0.14;
  const straightW = W - 2 * R, straightH = H - 2 * R;
  const per = 2 * straightW + 2 * straightH + 2 * Math.PI * R;
  const outlinePoint = (t: number): [number, number] => {
    let d = t * per;
    // top edge (left->right), starting after top-left corner
    if (d < straightW) return [-straightW / 2 + d, H / 2];
    d -= straightW;
    if (d < Math.PI * R / 2) {
      const a = d / R;
      return [straightW / 2 + Math.sin(a) * R, H / 2 - R + Math.cos(a) * R];
    }
    d -= Math.PI * R / 2;
    if (d < straightH) return [W / 2, H / 2 - R - d];
    d -= straightH;
    if (d < Math.PI * R / 2) {
      const a = d / R;
      return [W / 2 - R + Math.cos(a) * R, -H / 2 + R - Math.sin(a) * R];
    }
    d -= Math.PI * R / 2;
    if (d < straightW) return [straightW / 2 - d, -H / 2];
    d -= straightW;
    if (d < Math.PI * R / 2) {
      const a = d / R;
      return [-straightW / 2 - Math.sin(a) * R, -H / 2 + R - Math.cos(a) * R];
    }
    d -= Math.PI * R / 2;
    if (d < straightH) return [-W / 2, -H / 2 + R + d];
    d -= straightH;
    const a = d / R;
    return [-W / 2 + R - Math.cos(a) * R, H / 2 - R + Math.sin(a) * R];
  };
  const bars: [number, number, number, number][] = [
    // [cx, cy, w, h] — app rows on the screen
    [0, 0.34, 0.4, 0.055],
    [0, 0.12, 0.4, 0.055],
    [0, -0.1, 0.4, 0.055],
    [0, -0.32, 0.26, 0.055],
  ];
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z = gauss() * 0.02;
    const pick = rng();
    if (pick < 0.5) {
      const [px, py] = outlinePoint(rng());
      x = px + gauss() * 0.013;
      y = py + gauss() * 0.013;
    } else if (pick < 0.84) {
      const [cx, cy, w, h] = bars[(rng() * bars.length) | 0];
      x = cx + (rng() - 0.5) * w;
      y = cy + (rng() - 0.5) * h;
    } else if (pick < 0.88) {
      x = gauss() * 0.02;
      y = 0.52 + gauss() * 0.012; // camera dot
    } else {
      x = (rng() - 0.5) * (W - 0.1); // faint interior sparkle
      y = (rng() - 0.5) * (H - 0.14);
      z = gauss() * 0.03;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

/**
 * Text rasterized to particles (the signature: TECHNOVA / تكنوفا).
 * Client-only. `fontFamily` should come from the next/font CSS variables so
 * the canvas uses the real loaded faces; Arabic shaping is handled by the
 * 2D canvas text engine natively.
 */
export function buildWordSamples(
  count: number,
  text: string,
  fontFamily: string,
  seed = 7
): Float32Array {
  const W = 640, H = 160;
  const cnv = document.createElement("canvas");
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext("2d");
  const out = new Float32Array(count * 3);
  const rng = mulberry32(seed);
  const pts: number[] = [];
  if (ctx) {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(H * 0.58)}px ${fontFamily || "sans-serif"}`;
    ctx.fillText(text, W / 2, H / 2 + H * 0.03, W * 0.94);
    const data = ctx.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 110) pts.push(x, y);
      }
    }
  }
  const n = pts.length / 2;
  const scaleTo = 1.95; // world width, pre-uScale
  for (let i = 0; i < count; i++) {
    if (n === 0) {
      // font not ready / empty raster: soft ellipse placeholder
      const a = rng() * Math.PI * 2;
      out[i * 3] = Math.cos(a) * 0.8;
      out[i * 3 + 1] = Math.sin(a) * 0.2;
      out[i * 3 + 2] = 0;
      continue;
    }
    const pi = (rng() * n) | 0;
    const x = pts[pi * 2] + rng();
    const y = pts[pi * 2 + 1] + rng();
    out[i * 3] = (x / W - 0.5) * scaleTo;
    out[i * 3 + 1] = (0.5 - y / H) * scaleTo * (H / W);
    out[i * 3 + 2] = (rng() - 0.5) * 0.05;
  }
  return out;
}
