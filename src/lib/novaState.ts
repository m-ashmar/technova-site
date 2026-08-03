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
};

/** Fired on window when the intro finishes and the site is interactive. */
export const NOVA_LIVE_EVENT = "nova:live";
