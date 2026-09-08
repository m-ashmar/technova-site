import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clientIp,
  createBreaker,
  createLimiter,
  isAllowedOrigin,
} from "@/lib/nova/guards";
import {
  NOVA_CONTEXT_MAX_CHARS,
  NOVA_HOURLY_LIMIT,
  NOVA_HOURLY_WINDOW_MS,
  NOVA_MAX_MESSAGES,
  NOVA_MAX_TOKENS,
  NOVA_MESSAGE_MAX_CHARS,
  NOVA_RATE_LIMIT,
  NOVA_RATE_WINDOW_MS,
  NOVA_SUMMARY_MAX_TOKENS,
  resolveHourlyCap,
  resolveModel,
} from "@/lib/nova/limits";
import {
  NOVA_PASS_HEADER,
  NOVA_PASS_MARKER,
  advance,
  create,
  hash16,
  verify,
  type NovaPass,
} from "@/lib/nova/pass";
import {
  buildContextNote,
  buildSystemPrompt,
  detectReplyLanguage,
  type NovaTurn,
} from "@/lib/nova/prompt";

/**
 * The live NOVA turns inside the brief step (turns 1 and 2) and the brief
 * summary (turn 3). Streams a short Claude reply as raw UTF-8 text, then the
 * advanced session pass after a NUL marker. Contract: docs/nova-ai.md.
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

const Label = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1).max(NOVA_CONTEXT_MAX_CHARS));

/** The user turn that closes the transcript on turn 3 (language is set by the system prompt). */
const SUMMARY_CUE = "Write NOVA's brief for this conversation now.";

const ContextSchema = z.object({ type: Label, budget: Label, timeline: Label });

const TURN_SHAPES: Record<NovaTurn, readonly string[]> = {
  1: ["user"],
  2: ["user,assistant,user"],
  3: ["user,assistant", "user,assistant,user,assistant"],
};

const BodySchema = z
  .object({
    locale: z.enum(["en", "ar"]),
    turn: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    messages: z.array(MessageSchema).min(1).max(NOVA_MAX_MESSAGES),
    context: ContextSchema.optional(),
  })
  .superRefine((b, ctx) => {
    const roles = b.messages.map((m) => m.role).join(",");
    if (!TURN_SHAPES[b.turn].includes(roles)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "turn shape" });
    }
    if (b.turn === 3 && !b.context) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "context" });
    }
  });

const limitedShort = createLimiter(NOVA_RATE_LIMIT, NOVA_RATE_WINDOW_MS);
const limitedHourly = createLimiter(NOVA_HOURLY_LIMIT, NOVA_HOURLY_WINDOW_MS);
const busy = createBreaker(resolveHourlyCap(), NOVA_HOURLY_WINDOW_MS);

function fail(status: number, reason?: string) {
  return NextResponse.json(reason ? { ok: false, reason } : { ok: false }, {
    status,
  });
}

// Only a status word ever reaches the logs: no bodies, no prompts, no keys.
function statusWord(err: unknown): string {
  if (err instanceof Anthropic.APIUserAbortError) return "aborted";
  if (err instanceof Anthropic.APIError)
    return `${err.name} ${err.status ?? ""}`.trim();
  if (err instanceof Error) return err.name;
  return "unknown";
}

function textDelta(ev: Anthropic.MessageStreamEvent): string | null {
  return ev.type === "content_block_delta" && ev.delta.type === "text_delta"
    ? ev.delta.text
    : null;
}

/**
 * Sequence check. Turn 1 may start fresh (a pass is minted) or present an
 * unused pass; turn 2 needs the pass turn 1 issued and the genuine reply 1;
 * turn 3 needs a pass with one or two turns behind it and the genuine last
 * reply. A pass caps model calls at three by construction (turns 0 to 3).
 */
type Gate = { ok: true; pass: NovaPass } | { ok: false; status: 401 | 409 };

function gate(
  token: string | null,
  ip: string,
  turn: NovaTurn,
  messages: { role: string; content: string }[],
): Gate {
  if (turn === 1 && !token) return { ok: true, pass: create(ip) };
  const v = verify(token, ip);
  if (!v.ok) return { ok: false, status: 401 };
  const { pass } = v;
  if (turn === 1) {
    return pass.turns === 0 ? v : { ok: false, status: 409 };
  }
  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const expectedHash = lastAssistant ? hash16(lastAssistant.content) : "";
  if (turn === 2) {
    return pass.turns === 1 && pass.h === expectedHash
      ? v
      : { ok: false, status: 409 };
  }
  return pass.turns >= 1 && pass.turns <= 2 && pass.h === expectedHash
    ? v
    : { ok: false, status: 409 };
}

export async function POST(req: Request) {
  // Same gates as /api/intake: JSON forces a CORS preflight a foreign origin
  // cannot pass, and a missing Origin means a non-browser caller.
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json"))
    return fail(415);
  if (!isAllowedOrigin(req.headers.get("origin"))) return fail(403);
  const ip = clientIp(req);
  if (limitedShort(ip) || limitedHourly(ip)) return fail(429, "rate");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid");
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return fail(400, "invalid");
  const { locale, turn, messages, context } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(503, "unconfigured");

  const gated = gate(req.headers.get(NOVA_PASS_HEADER), ip, turn, messages);
  if (!gated.ok)
    return fail(gated.status, gated.status === 401 ? "pass" : "sequence");
  const pass = gated.pass;

  // Counted only for requests that reach the model.
  if (busy()) return fail(429, "busy");

  const reply = detectReplyLanguage(messages[0].content, locale);
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt(locale, turn, reply),
      cache_control: { type: "ephemeral" },
    },
  ];
  if (turn === 3 && context) {
    system.push({ type: "text", text: buildContextNote(context) });
  }

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 10_000 });
  const upstream = client.messages.stream(
    {
      model: resolveModel(),
      max_tokens: turn === 3 ? NOVA_SUMMARY_MAX_TOKENS : NOVA_MAX_TOKENS,
      // The reply is about 70 words; thinking tokens would come out of the
      // same small budget, so the turn runs without it.
      thinking: { type: "disabled" },
      system,
      // Turn 3 arrives ending on NOVA's own last line; the API would treat
      // that as a prefill to continue, so a closing cue asks for the brief.
      messages:
        turn === 3
          ? [...messages, { role: "user", content: SUMMARY_CUE }]
          : messages,
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

  // The full reply is buffered alongside the stream so the advanced pass can
  // carry its hash; the pass is the last chunk, after the NUL marker.
  let full = first;
  const encoder = new TextEncoder();
  const finish = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    try {
      controller.enqueue(
        encoder.encode(`\n${NOVA_PASS_MARKER}${advance(pass, full)}`),
      );
    } catch (err) {
      // A cancelled stream refuses the chunk; nothing to hand out then.
      console.error(`[nova] pass failed: ${statusWord(err)}`);
    }
    try {
      controller.close();
    } catch {
      // already closed or cancelled
    }
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first));
    },
    async pull(controller) {
      try {
        for (;;) {
          const { value, done } = await events.next();
          if (done) {
            finish(controller);
            return;
          }
          const t = textDelta(value);
          if (t) {
            full += t;
            controller.enqueue(encoder.encode(t));
            return;
          }
        }
      } catch (err) {
        // Mid-reply failure: end the stream with what arrived, plus a pass
        // over that text so the conversation can still continue. The visitor
        // sees a shorter reply rather than a broken one.
        if (!upstream.aborted)
          console.error(`[nova] stream ended: ${statusWord(err)}`);
        finish(controller);
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
