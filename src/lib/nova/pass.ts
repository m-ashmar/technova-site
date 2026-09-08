import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The NOVA session pass: a stateless HMAC-SHA256 token that ties a caller to
 * a real conversation sequence. Turn 2 and turn 3 must present the pass the
 * previous turn handed out, and its `h` must match the assistant reply the
 * caller sends back, so nobody can fabricate NOVA's prior lines or replay a
 * pass out of order. Contract: docs/nova-ai.md.
 *
 * Framing: the advanced pass travels as the very last chunk of the streamed
 * reply, after NOVA_PASS_MARKER, because headers are sent before the reply
 * text (and therefore its hash) exists.
 */

export const NOVA_PASS_VERSION = 1 as const;
export const NOVA_PASS_TTL_S = 45 * 60;
export const NOVA_PASS_HEADER = "x-nova-pass";
/** Appended to the stream as "\n" + marker + token. NUL never occurs in model text. */
export const NOVA_PASS_MARKER = "\u0000pass:";

export interface NovaPass {
  v: typeof NOVA_PASS_VERSION;
  /** 16 random hex chars */
  id: string;
  /** unix seconds */
  iat: number;
  exp: number;
  /** first 16 hex of sha256(client ip) */
  ip: string;
  /** model calls completed under this pass: 0 at mint, 3 at most */
  turns: number;
  /** first 16 hex of sha256(last assistant reply, trimmed), or "" before turn 1 */
  h: string;
}

export type NovaPassReason = "missing" | "bad" | "expired" | "ip";
export type NovaPassVerdict =
  | { ok: true; pass: NovaPass }
  | { ok: false; reason: NovaPassReason };

function sha256(input: string): Buffer {
  return createHash("sha256").update(input, "utf8").digest();
}

/** First 16 hex of sha256(text). Replies are trimmed first so the framing newline never matters. */
export function hash16(text: string): string {
  return sha256(text.trim()).toString("hex").slice(0, 16);
}

/**
 * NOVA_SECRET when set; otherwise derived from the API key so a deployment
 * that already runs the live turn needs nothing new. Null means the live
 * turn is unconfigured anyway.
 */
function secret(): Buffer | null {
  const explicit = process.env.NOVA_SECRET?.trim();
  if (explicit) return Buffer.from(explicit, "utf8");
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return sha256(`nova-pass:${key}`);
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payloadB64: string, key: Buffer): string {
  return b64url(createHmac("sha256", key).update(payloadB64).digest());
}

function encode(pass: NovaPass): string {
  const key = secret();
  if (!key) throw new Error("nova pass secret unavailable");
  const payload = b64url(Buffer.from(JSON.stringify(pass), "utf8"));
  return `${payload}.${sign(payload, key)}`;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

/** A fresh, unused pass for this caller (turns 0, no reply hash yet). */
export function create(ip: string): NovaPass {
  const iat = now();
  return {
    v: NOVA_PASS_VERSION,
    id: randomBytes(8).toString("hex"),
    iat,
    exp: iat + NOVA_PASS_TTL_S,
    ip: hash16(ip),
    turns: 0,
    h: "",
  };
}

export function mint(ip: string): string {
  return encode(create(ip));
}

function isPass(x: unknown): x is NovaPass {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    p.v === NOVA_PASS_VERSION &&
    typeof p.id === "string" &&
    /^[0-9a-f]{16}$/.test(p.id) &&
    typeof p.iat === "number" &&
    Number.isInteger(p.iat) &&
    typeof p.exp === "number" &&
    Number.isInteger(p.exp) &&
    typeof p.ip === "string" &&
    /^[0-9a-f]{16}$/.test(p.ip) &&
    typeof p.turns === "number" &&
    Number.isInteger(p.turns) &&
    p.turns >= 0 &&
    p.turns <= 3 &&
    typeof p.h === "string" &&
    (p.h === "" || /^[0-9a-f]{16}$/.test(p.h))
  );
}

export function verify(token: string | null | undefined, ip: string): NovaPassVerdict {
  if (!token) return { ok: false, reason: "missing" };
  if (token.length > 1024) return { ok: false, reason: "bad" };
  const key = secret();
  if (!key) return { ok: false, reason: "bad" };
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: "bad" };
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, key);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "bad" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "bad" };
  }
  if (!isPass(parsed)) return { ok: false, reason: "bad" };
  const t = now();
  if (parsed.exp <= t || parsed.iat > t + 60) return { ok: false, reason: "expired" };
  if (parsed.ip !== hash16(ip)) return { ok: false, reason: "ip" };
  return { ok: true, pass: parsed };
}

/** Next pass after a completed model call: same id and expiry, turns + 1, h = hash of the reply. */
export function advance(pass: NovaPass, replyText: string): string {
  return encode({ ...pass, turns: pass.turns + 1, h: hash16(replyText) });
}
