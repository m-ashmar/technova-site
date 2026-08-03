import { mulberry32 } from "./star";

/**
 * Data for the scroll journey's later stages.
 *
 * Stage 2 (the flow) is not here at all: it is generated procedurally in the
 * vertex shader from time, because it must actually move — particles stream
 * like data packets rather than settling into a fixed silhouette.
 *
 * Stage 3 (the living graph) stores only the *topology* — which node, or
 * which pair of nodes, each particle belongs to. The nodes drift, the links
 * retract and reconnect, and pulses run along them, all on the GPU.
 *
 * Stage 4 (the wordmark) is rasterized from live text so it follows the
 * locale.
 */

function gaussFactory(rng: () => number) {
  return () => {
    let u = 0;
    while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
}

export interface GraphSamples {
  /** node A (or, for node particles, the node itself) */
  a: Float32Array;
  /** node B — identical to A for node particles, which marks them as nodes */
  b: Float32Array;
  /** position along the A→B link, 0 for node particles */
  t: Float32Array;
}

/**
 * A constellation of nodes joined to their nearest neighbours. Positions are
 * exact node centres (no jitter baked in) so every particle belonging to a
 * node shares its drift and the cluster moves as one; the spread is added in
 * the shader instead.
 */
export function buildGraphSamples(count: number, seed = 11): GraphSamples {
  const rng = mulberry32(seed);
  const N = 24;

  // Golden-angle spiral: even coverage without clumping.
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt((i + 0.5) / N) * 0.95;
    const ang = i * 2.399963229728653;
    nodes.push([
      Math.cos(ang) * r,
      Math.sin(ang) * r * 0.72,
      (rng() - 0.5) * 0.32,
    ]);
  }

  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < N; i++) {
    const near = nodes
      .map((n, j) => ({
        j,
        d: Math.hypot(n[0] - nodes[i][0], n[1] - nodes[i][1], n[2] - nodes[i][2]),
      }))
      .filter((e) => e.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const e of near) {
      const lo = Math.min(i, e.j);
      const hi = Math.max(i, e.j);
      const k = `${lo}-${hi}`;
      if (!seen.has(k)) {
        seen.add(k);
        edges.push([lo, hi]);
      }
    }
  }

  const a = new Float32Array(count * 3);
  const b = new Float32Array(count * 3);
  const t = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    if (rng() < 0.32) {
      const n = nodes[(rng() * N) | 0];
      a.set(n, i * 3);
      b.set(n, i * 3);
      t[i] = 0;
    } else {
      const [p, q] = edges[(rng() * edges.length) | 0];
      a.set(nodes[p], i * 3);
      b.set(nodes[q], i * 3);
      t[i] = rng();
    }
  }

  return { a, b, t };
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
  const W = 640,
    H = 160;
  const cnv = document.createElement("canvas");
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext("2d");
  const out = new Float32Array(count * 3);
  const rng = mulberry32(seed);
  const gauss = gaussFactory(rng);
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
      const ang = rng() * Math.PI * 2;
      out[i * 3] = Math.cos(ang) * 0.8;
      out[i * 3 + 1] = Math.sin(ang) * 0.2;
      out[i * 3 + 2] = 0;
      continue;
    }
    const pi = (rng() * n) | 0;
    const x = pts[pi * 2] + rng();
    const y = pts[pi * 2 + 1] + rng();
    out[i * 3] = (x / W - 0.5) * scaleTo;
    out[i * 3 + 1] = (0.5 - y / H) * scaleTo * (H / W);
    out[i * 3 + 2] = gauss() * 0.02;
  }
  return out;
}
