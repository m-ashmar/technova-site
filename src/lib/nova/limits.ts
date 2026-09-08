/**
 * Cost and abuse ceilings for the live NOVA turns. Every number that bounds a
 * model call or a request lives here so the docs and the route agree.
 */

/** Model for the live turns; overridable per deployment with NOVA_MODEL. */
export const NOVA_DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/** Hard cap on reply length for turns 1 and 2. Arabic spends more tokens per word than English, so the cap sits above the ~60-word ask. */
export const NOVA_MAX_TOKENS = 320;
/** Turn 3, the brief summary: 3 to 5 sentences of prose. */
export const NOVA_SUMMARY_MAX_TOKENS = 360;

/** Requests per IP, two fixed windows: 8 per 10 minutes and 16 per hour. Three turns per brief leaves room for a retry. */
export const NOVA_RATE_LIMIT = 8;
export const NOVA_RATE_WINDOW_MS = 10 * 60 * 1000;
export const NOVA_HOURLY_LIMIT = 16;
export const NOVA_HOURLY_WINDOW_MS = 60 * 60 * 1000;

/** Circuit breaker: model calls per hour per instance, overridable with NOVA_HOURLY_CAP. */
export const NOVA_DEFAULT_HOURLY_CAP = 120;

/** Per-message and per-request shape limits (contract: POST /api/nova). */
export const NOVA_MESSAGE_MAX_CHARS = 1500;
export const NOVA_MAX_MESSAGES = 5;
/** Turn 3 context labels (type, budget, timeline), each at most this long. */
export const NOVA_CONTEXT_MAX_CHARS = 80;

export function resolveModel(): string {
  const fromEnv = process.env.NOVA_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : NOVA_DEFAULT_MODEL;
}

export function resolveHourlyCap(): number {
  const n = Number.parseInt(process.env.NOVA_HOURLY_CAP ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : NOVA_DEFAULT_HOURLY_CAP;
}
