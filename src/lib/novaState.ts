/**
 * Mutable singleton bridging GSAP timelines and the WebGL scene.
 * The render loop reads it every frame — no React re-renders involved.
 */
export const novaState = {
  /** 0 = scattered dust · ~0.62 = collapsed core · 1 = star formed */
  progress: 0,
  /** breathing amplitude once formed (reduced-motion dampens it) */
  idle: 1,
  /** bloom intensity (spiked by the ignition flash) */
  bloom: 1.15,
  /** scroll journey: 0 star · 1 phone · 2 neural web · 3 wordmark */
  morph: 0,
  /** organism offset as fractions of the half-viewport (RTL-aware sign) */
  offX: 0,
  offY: 0,
  /** organism scale multiplier on top of the responsive base scale */
  zoom: 1,
};

/**
 * Where the star must sit while the hero owns the screen: dead centre of the
 * gap in "TE ★ CH", at the master logo's own star-to-letter proportions.
 * IgnitionHero measures the real DOM and writes it here; ScrollDirector uses
 * it as the journey's starting pose.
 */
export const heroAnchor = { x: 0, y: 0, zoom: 1 };

/** Fired on window when the intro finishes and the site is interactive. */
export const NOVA_LIVE_EVENT = "nova:live";

/** Fired when layout moves and scroll positions must be re-measured. */
export const NOVA_LAYOUT_EVENT = "nova:layout";
