let cached: boolean | null = null;

/** Whether this browser can actually give us a WebGL context. */
export function webglSupported(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    cached = !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    cached = false;
  }
  return cached;
}

/** Fired when the scene cannot run, so the hero can draw the static logo. */
export const SCENE_FAILED_EVENT = "nova:scene-failed";

/** Fired once the renderer exists and the star can actually be seen forming. */
export const SCENE_READY_EVENT = "nova:scene-ready";
