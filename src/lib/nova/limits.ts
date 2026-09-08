/**
 * Cost and abuse ceilings for the live NOVA turn. Every number that bounds a
 * model call or a request lives here so the docs and the route agree.
 */

/** Model for the live turn; overridable per deployment with NOVA_MODEL. */
export const NOVA_DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/** Hard cap on reply length. Arabic spends more tokens per word than English, so the cap sits above the ~60-word ask. */
export const NOVA_MAX_TOKENS = 320;

/** Requests per IP per window. Two live turns per brief leaves ample room. */
export const NOVA_RATE_LIMIT = 20;
export const NOVA_RATE_WINDOW_MS = 10 * 60 * 1000;

/** Per-message and per-request shape limits (contract: POST /api/nova). */
export const NOVA_MESSAGE_MAX_CHARS = 1500;
export const NOVA_MAX_MESSAGES = 5;

export function resolveModel(): string {
  const fromEnv = process.env.NOVA_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : NOVA_DEFAULT_MODEL;
}
