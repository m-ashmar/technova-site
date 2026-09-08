import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * NOVA's delivery endpoint. Validates the scripted-intake brief and forwards
 * it by email when RESEND_API_KEY is configured; otherwise reports
 * delivered:false so the UI offers the prefilled-mailto fallback.
 */

const IntakeSchema = z.object({
  type: z.string().min(1).max(60),
  brief: z.string().min(1).max(2000),
  budget: z.string().max(60),
  timeline: z.string().max(60),
  contact: z.string().min(3).max(200),
  locale: z.enum(["en", "ar"]),
  // honeypot, humans never fill it
  website: z.string().max(200).optional(),
  // The live NOVA exchange inside the brief step, when it happened. Appended
  // to the email under its own heading; absent when the turn was skipped or
  // the assistant was unconfigured.
  conversation: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(6000))
    .optional(),
});

// Only our own pages may post a brief. Without this, any site could make ITS
// visitors submit from their residential IPs, every one a fresh bucket for
// the per-IP limiter below, and a real inbox full of forged leads.
const ALLOWED_ORIGINS = [
  "https://www.technovadev.com",
  "https://technovadev.com",
  // The site is served from its Vercel host too, the production alias and
  // every preview deployment. Vercel populates both of these at build time;
  // omitting them 403s the only conversion path on one of our own hosts.
  ...[
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]
    .filter(Boolean)
    .map((host) => `https://${host}`),
  // dev servers, never trusted in a production deployment
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3210"]
    : []),
];

// A reply_to Resend cannot parse fails the whole send, and the contact answer
// is free text, visitors often give a WhatsApp number instead of an address.
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;".]+(?:\.[^\s@<>,;".]+)+$/;

// Minimal per-instance rate limit (good enough for v1; serverless instances
// are short-lived anyway).
const hits = new Map<string, { n: number; t: number }>();
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > LIMIT;
}

export async function POST(req: Request) {
  // text/plain is a CORS "simple request" and ships cross-origin with no
  // preflight; insisting on JSON forces one, and a foreign origin cannot pass
  // it because we answer no OPTIONS. Rejections stay vague on purpose.
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }

  // Browsers always send Origin on a cross-site POST, so a missing one means a
  // caller that is not a browser, untrusted either way.
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const d = parsed.data;

  // Bots that fill the honeypot get a polite success and nothing else.
  if (d.website) {
    return NextResponse.json({ ok: true, delivered: false });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.INTAKE_TO ?? "nova@technovadev.com";
  // Resend only allows a verified domain as the sender. Until technovadev.com
  // is verified there, their shared test sender is the one that works, so the
  // address is an env var and verifying the domain needs no code change.
  const from = process.env.INTAKE_FROM ?? "NOVA <onboarding@resend.dev>";
  if (!key) {
    return NextResponse.json({ ok: true, delivered: false });
  }

  const text = [
    "NOVA intake brief",
    "",
    `Type:     ${d.type}`,
    `Budget:   ${d.budget}`,
    `Timeline: ${d.timeline}`,
    `Contact:  ${d.contact}`,
    `Locale:   ${d.locale}`,
    "",
    "Brief:",
    d.brief,
    ...(d.conversation ? ["", "Conversation:", d.conversation] : []),
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        // The mail arrives from our own sender, so without this Reply answers
        // ourselves. Omitted rather than guessed when the contact is a phone.
        ...(EMAIL_RE.test(d.contact) ? { reply_to: d.contact } : {}),
        subject: `NOVA intake: ${d.type} (${d.contact})`,
        text,
      }),
    });
    if (!res.ok) {
      // A silent pipeline loses leads without anyone noticing: an expired key
      // or an unverified sender otherwise looks exactly like a delivered brief.
      const detail = await res.text().catch(() => "<body unreadable>");
      console.error(`[intake] Resend rejected the send: ${res.status} ${detail}`);
      return NextResponse.json({ ok: false, delivered: false }, { status: 502 });
    }
    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("[intake] Resend request failed:", err);
    return NextResponse.json({ ok: false, delivered: false }, { status: 502 });
  }
}
