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
  NOVA_BRIEF_MIN_MESSAGES,
  NOVA_CHAT_MAX_CALLS,
  NOVA_CHAT_MAX_MESSAGES,
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
  NOVA_NEXT_MARKER,
  NOVA_PASS_HEADER,
  NOVA_PASS_MARKER,
  advance,
  create,
  hash16,
  verify,
  type NovaPass,
} from "@/lib/nova/pass";
import {
  buildCallNote,
  buildContextNote,
  buildSystemPrompt,
  detectReplyLanguage,
  type NovaKind,
  type NovaNext,
} from "@/lib/nova/prompt";

/**
 * The live NOVA calls inside the intake: up to four chat exchanges per pass
 * (kind "chat"), each streaming a short Claude reply followed by a next-step
 * marker, and the brief for the team (kind "brief") once the guided steps
 * have collected type, budget and timeline. Both stream raw UTF-8 text, then
 * the advanced session pass after a NUL marker. Contract: docs/nova-ai.md.
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

/** The user turn that closes the transcript for the brief (language is set by the system prompt). */
const SUMMARY_CUE = "Write NOVA's brief for this conversation now.";

const ContextSchema = z.object({ type: Label, budget: Label, timeline: Label });

type Role = "user" | "assistant";

/** Starts with user and alternates strictly. */
function alternates(roles: Role[]): boolean {
  return roles.every((r, i) => r === (i % 2 === 0 ? "user" : "assistant"));
}

const BodySchema = z
  .object({
    locale: z.enum(["en", "ar"]),
    kind: z.enum(["chat", "brief"]),
    messages: z.array(MessageSchema).min(1).max(NOVA_MAX_MESSAGES),
    context: ContextSchema.optional(),
  })
  .superRefine((b, ctx) => {
    const roles = b.messages.map((m) => m.role);
    const bad = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    if (!alternates(roles)) bad("shape");
    if (b.kind === "chat") {
      // 1..7 messages ending with the visitor: at most four user messages.
      if (roles.length > NOVA_CHAT_MAX_MESSAGES) bad("shape");
      if (roles[roles.length - 1] !== "user") bad("shape");
    } else {
      // The whole thread, ending with either role, plus the guided labels.
      if (roles.length < NOVA_BRIEF_MIN_MESSAGES) bad("shape");
      if (!b.context) bad("context");
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
 * Sequence check. A first chat call (one message) may start fresh (a pass is
 * minted) or present a pass; every other call needs the pass the previous
 * call issued. The pass must have seen exactly as many chat calls as the
 * body has assistant messages, and its hash must match the last of them, so
 * NOVA's lines cannot be fabricated. Chat calls stop at four per pass; the
 * brief needs at least one completed chat call behind it.
 */
type Gate = { ok: true; pass: NovaPass } | { ok: false; status: 401 | 409 };

function gate(
  token: string | null,
  ip: string,
  kind: NovaKind,
  messages: { role: Role; content: string }[],
): Gate {
  if (kind === "chat" && messages.length === 1 && !token)
    return { ok: true, pass: create(ip) };
  const v = verify(token, ip);
  if (!v.ok) return { ok: false, status: 401 };
  const { pass } = v;
  const assistants = messages.filter((m) => m.role === "assistant");
  const last = assistants[assistants.length - 1];
  const expectedHash = last ? hash16(last.content) : "";
  if (kind === "chat") {
    return pass.turns === assistants.length &&
      pass.turns < NOVA_CHAT_MAX_CALLS &&
      pass.h === expectedHash
      ? v
      : { ok: false, status: 409 };
  }
  return pass.turns >= 1 && last !== undefined && pass.h === expectedHash
    ? v
    : { ok: false, status: 409 };
}

/** The chat reply ends with "[[ask]]" or "[[ready]]" on its own line; the server keeps it. */
const TAIL_RE = /\s*\[\[(ask|ready)\]\]\s*$/;
/** Characters held back from the stream until it ends, enough to cover "\n[[ready]]". */
const HOLD = 12;
/** The prompt forbids em and en dashes; the model still lets one through now and then. */
const DASH_RE = /\s*[\u2014\u2013]/g;

/**
 * Next step after a chat reply: the model's tail when it wrote one, else a
 * guess from the shape of the exchange. The fourth call is always the last.
 */
function decideNext(
  tail: NovaNext | null,
  visible: string,
  userCount: number,
  callIndex: number,
): NovaNext {
  if (callIndex >= NOVA_CHAT_MAX_CALLS) return "ready";
  if (tail) return tail;
  return userCount >= 2 || !/[?؟]/.test(visible) ? "ready" : "ask";
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
  const { locale, kind, messages, context } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fail(503, "unconfigured");

  const gated = gate(req.headers.get(NOVA_PASS_HEADER), ip, kind, messages);
  if (!gated.ok)
    return fail(gated.status, gated.status === 401 ? "pass" : "sequence");
  const pass = gated.pass;
  const isChat = kind === "chat";
  // 1 to 4 for chat: the pass counts the calls already completed.
  const callIndex = pass.turns + 1;
  const userCount = messages.filter((m) => m.role === "user").length;

  // Counted only for requests that reach the model.
  if (busy()) return fail(429, "busy");

  const reply = detectReplyLanguage(messages[0].content, locale);
  const system: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt(locale, kind, reply),
      cache_control: { type: "ephemeral" },
    },
  ];
  if (isChat) {
    system.push({ type: "text", text: buildCallNote(callIndex) });
  } else if (context) {
    system.push({ type: "text", text: buildContextNote(context) });
  }

  // The brief thread may end on NOVA's own last line, which the API would
  // treat as a prefill to continue, so a closing user cue asks for the
  // brief. When the thread already ends with the visitor, the cue joins
  // that message rather than opening a second consecutive user turn.
  let modelMessages: Anthropic.MessageParam[] = messages;
  if (!isChat) {
    const lastMessage = messages[messages.length - 1];
    modelMessages =
      lastMessage.role === "assistant"
        ? [...messages, { role: "user", content: SUMMARY_CUE }]
        : [
            ...messages.slice(0, -1),
            {
              role: "user",
              content: `${lastMessage.content}\n\n${SUMMARY_CUE}`,
            },
          ];
  }

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 10_000 });
  const upstream = client.messages.stream(
    {
      model: resolveModel(),
      max_tokens: isChat ? NOVA_MAX_TOKENS : NOVA_SUMMARY_MAX_TOKENS,
      // The reply is about 70 words; thinking tokens would come out of the
      // same small budget, so the call runs without it.
      thinking: { type: "disabled" },
      system,
      messages: modelMessages,
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

  // The full reply is buffered alongside the stream: the control tail is
  // stripped from it at the end and the advanced pass carries its hash. The
  // last HOLD characters are never streamed until the reply is complete, so
  // the tail never reaches the visitor; whatever of them is not the tail is
  // flushed with the markers as the final chunk.
  let raw = "";
  let sent = 0;
  const encoder = new TextEncoder();
  const take = (t: string): string => {
    // Dashes are normalised inside the unsent window only, so the emitted
    // prefix never changes under the client's feet.
    raw = raw.slice(0, sent) + (raw.slice(sent) + t).replace(DASH_RE, ",");
    if (raw.length - sent <= HOLD) return "";
    let cut = raw.length - HOLD;
    // never split a surrogate pair across chunks
    const code = raw.charCodeAt(cut - 1);
    if (code >= 0xd800 && code <= 0xdbff) cut -= 1;
    if (cut <= sent) return "";
    const out = raw.slice(sent, cut);
    sent = cut;
    return out;
  };
  const finish = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    const match = isChat ? raw.match(TAIL_RE) : null;
    const visible = isChat ? raw.replace(TAIL_RE, "") : raw;
    let out = visible.length > sent ? visible.slice(sent) : "";
    if (isChat) {
      const tail = match ? (match[1] as NovaNext) : null;
      const next = decideNext(tail, visible, userCount, callIndex);
      out += `\n${NOVA_NEXT_MARKER}${next}`;
    }
    try {
      out += `\n${NOVA_PASS_MARKER}${advance(pass, visible)}`;
      controller.enqueue(encoder.encode(out));
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
      const out = take(first);
      if (out) controller.enqueue(encoder.encode(out));
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
            const out = take(t);
            if (out) {
              controller.enqueue(encoder.encode(out));
              return;
            }
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
