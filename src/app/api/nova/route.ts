import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, createLimiter, isAllowedOrigin } from "@/lib/nova/guards";
import {
  NOVA_MAX_MESSAGES,
  NOVA_MAX_TOKENS,
  NOVA_MESSAGE_MAX_CHARS,
  NOVA_RATE_LIMIT,
  NOVA_RATE_WINDOW_MS,
  resolveModel,
} from "@/lib/nova/limits";
import { buildSystemPrompt } from "@/lib/nova/prompt";

/**
 * The live NOVA turn inside the brief step. Streams a short Claude reply as
 * raw UTF-8 text. Contract: docs/nova-ai.md.
 *
 * Without ANTHROPIC_API_KEY this answers 503 and the chat keeps its scripted
 * behaviour; nothing else on the site depends on this route.
 */

// loadContent() reads content/*.json from disk, so this must stay on Node.
export const runtime = "nodejs";
export const maxDuration = 30;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(NOVA_MESSAGE_MAX_CHARS)),
});

const BodySchema = z
  .object({
    locale: z.enum(["en", "ar"]),
    turn: z.union([z.literal(1), z.literal(2)]),
    messages: z.array(MessageSchema).min(1).max(NOVA_MAX_MESSAGES),
  })
  .superRefine((b, ctx) => {
    const roles = b.messages.map((m) => m.role).join(",");
    const expected = b.turn === 1 ? "user" : "user,assistant,user";
    if (roles !== expected) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "turn shape" });
    }
  });

const limited = createLimiter(NOVA_RATE_LIMIT, NOVA_RATE_WINDOW_MS);

function fail(status: number, reason?: string) {
  return NextResponse.json(reason ? { ok: false, reason } : { ok: false }, { status });
}

// Only a status word ever reaches the logs: no bodies, no prompts, no keys.
function statusWord(err: unknown): string {
  if (err instanceof Anthropic.APIUserAbortError) return "aborted";
  if (err instanceof Anthropic.APIError) return `${err.name} ${err.status ?? ""}`.trim();
  if (err instanceof Error) return err.name;
  return "unknown";
}

function textDelta(ev: Anthropic.MessageStreamEvent): string | null {
  return ev.type === "content_block_delta" && ev.delta.type === "text_delta"
    ? ev.delta.text
    : null;
}

export async function POST(req: Request) {
  // Same gates as /api/intake: JSON forces a CORS preflight a foreign origin
  // cannot pass, and a missing Origin means a non-browser caller.
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return fail(415);
  if (!isAllowedOrigin(req.headers.get("origin"))) return fail(403);
  if (limited(clientIp(req))) return fail(429, "rate");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid");
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid");
  const { locale, turn, messages } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(503, "unconfigured");

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 10_000 });
  const upstream = client.messages.stream(
    {
      model: resolveModel(),
      max_tokens: NOVA_MAX_TOKENS,
      // The reply is about 70 words; thinking tokens would come out of the
      // same small budget, so the turn runs without it.
      thinking: { type: "disabled" },
      system: [
        {
          type: "text",
          text: buildSystemPrompt(locale, turn),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    },
    { signal: req.signal },
  );
  const abortUpstream = () => upstream.abort();
  req.signal.addEventListener("abort", abortUpstream, { once: true });

  const events = upstream[Symbol.asyncIterator]();

  // Hold the response until the first text arrives, so a model call that
  // fails before producing anything is a clean 502 rather than an empty 200.
  let first: string | null = null;
  try {
    for (;;) {
      const { value, done } = await events.next();
      if (done) break;
      const t = textDelta(value);
      if (t !== null && t.length > 0) {
        first = t;
        break;
      }
    }
  } catch (err) {
    console.error(`[nova] upstream failed: ${statusWord(err)}`);
    abortUpstream();
    return fail(502, "upstream");
  }
  if (first === null) {
    console.error("[nova] upstream failed: empty");
    abortUpstream();
    return fail(502, "upstream");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first));
    },
    async pull(controller) {
      try {
        for (;;) {
          const { value, done } = await events.next();
          if (done) {
            controller.close();
            return;
          }
          const t = textDelta(value);
          if (t) {
            controller.enqueue(encoder.encode(t));
            return;
          }
        }
      } catch (err) {
        // Mid-reply failure: end the stream with what arrived. The visitor
        // sees a shorter reply rather than a broken one.
        if (!upstream.aborted) console.error(`[nova] stream ended: ${statusWord(err)}`);
        controller.close();
      }
    },
    cancel() {
      abortUpstream();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Nova": "live",
    },
  });
}
