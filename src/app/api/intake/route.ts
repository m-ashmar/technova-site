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
  // honeypot — humans never fill it
  website: z.string().max(200).optional(),
});

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
  const to = process.env.INTAKE_TO ?? "nova@technovasy.com";
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
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NOVA <onboarding@resend.dev>",
        to: [to],
        subject: `NOVA intake — ${d.type} (${d.contact})`,
        text,
      }),
    });
    return NextResponse.json({ ok: true, delivered: res.ok });
  } catch {
    return NextResponse.json({ ok: true, delivered: false });
  }
}
