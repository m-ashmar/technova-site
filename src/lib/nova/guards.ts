/**
 * Request guards for /api/nova. These mirror the Origin allowlist and the
 * per-IP limiter in /api/intake on purpose: that route is the audited
 * conversion path and stays self-contained, so the pattern is duplicated
 * here rather than shared.
 */

// Only our own pages may talk to NOVA. Without this, any site could make ITS
// visitors spend our model budget from their residential IPs, each one a
// fresh bucket for the per-IP limiter below.
export const ALLOWED_ORIGINS: readonly string[] = [
  "https://www.technovadev.com",
  "https://technovadev.com",
  // The site is served from its Vercel host too: the production alias and
  // every preview deployment. Vercel populates both at build time.
  ...[process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`),
  // dev servers, never trusted in a production deployment
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3210"]
    : []),
];

export function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

/** First hop of x-forwarded-for, or "local" when there is no proxy. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/**
 * Minimal per-instance fixed-window limiter. Serverless instances are
 * short-lived, so the map never grows for long; the sweep keeps a long-lived
 * dev server tidy.
 */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { n: number; t: number }>();
  return function limited(key: string): boolean {
    const now = Date.now();
    if (hits.size > 1000) {
      for (const [k, h] of hits) if (now - h.t > windowMs) hits.delete(k);
    }
    const h = hits.get(key);
    if (!h || now - h.t > windowMs) {
      hits.set(key, { n: 1, t: now });
      return false;
    }
    h.n += 1;
    return h.n > limit;
  };
}
