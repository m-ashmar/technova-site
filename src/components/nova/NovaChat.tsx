"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import NovaBot, { type BotMood } from "./NovaBot";
import { useNovaTurn, type NovaMessage } from "./useNovaTurn";

type Pick = { id: string; label: string };
type ChipField = "type" | "budget" | "timeline";
type TextField = "contact" | "brief";
type StepId = ChipField | TextField;

interface Answers {
  type?: Pick;
  brief?: string;
  budget?: Pick;
  timeline?: Pick;
  contact?: string;
}
type Phase = "flow" | "sending" | "sent" | "error";

/**
 * The live exchange inside the brief step. It opens when the brief is
 * submitted and gates the budget step until it is "done" (the visitor
 * answered or skipped) or "off" (no key, rate-limited, network failed:
 * the scripted flow continues exactly as before).
 */
type ExchangeStatus =
  | "idle"
  | "streaming1"
  | "awaiting"
  | "streaming2"
  | "done"
  | "off";
const EXCHANGE_STATUSES: readonly ExchangeStatus[] = [
  "idle",
  "streaming1",
  "awaiting",
  "streaming2",
  "done",
  "off",
];
interface Exchange {
  status: ExchangeStatus;
  reply1?: string;
  answer?: string;
  reply2?: string;
}
const NO_EXCHANGE: Exchange = { status: "idle" };

/**
 * The funnel, in order, one entry per question, so the order lives in data
 * instead of in a chain of ternaries.
 *
 * Contact is SECOND on purpose. It used to be last, behind a required
 * multi-paragraph brief and two chip rows: anyone who hesitated at the budget
 * question left the founder nothing at all, no address, no partial record.
 * Asking for the address right after the direction means every abandoned
 * conversation still leaves a reachable human. The copy in
 * content/site.{en,ar}.json is written for this position.
 *
 * `kind` decides which control the step renders; the API payload keys are
 * unrelated to this order and must not change (the route validates them).
 */
const STEPS = [
  { id: "type", kind: "chips" },
  { id: "contact", kind: "line" },
  { id: "brief", kind: "area" },
  { id: "budget", kind: "chips" },
  { id: "timeline", kind: "chips" },
] as const;

/** sessionStorage, not localStorage: a brief is for this visit only. */
const DRAFT_KEY = "nova-draft";

/** Mirrors the zod caps on /api/intake so a restored draft can always be sent. */
const CAP = { brief: 2000, contact: 200, label: 60, reply: 1500 } as const;

interface StoredDraft {
  answers: Answers;
  briefDraft: string;
  contactDraft: string;
  exchange: Exchange;
  answerDraft: string;
}

function readPick(v: unknown): Pick | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.label !== "string") return undefined;
  if (!o.label.trim()) return undefined;
  return { id: o.id.slice(0, CAP.label), label: o.label.slice(0, CAP.label) };
}

function readText(v: unknown, cap: number): string | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  return v.slice(0, cap);
}

/**
 * A restored exchange must land in a state the flow can continue from.
 * A stream never resumes ("streaming1"/"streaming2" become "off"), and a
 * status that lacks the reply it presupposes is treated as "off" too. A
 * draft written before the live turn existed has a brief but no exchange:
 * "off" keeps that visitor moving instead of trapping them at the brief.
 */
function readExchange(v: unknown, hasBrief: boolean): Exchange {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const raw = o.status;
  let status: ExchangeStatus =
    typeof raw === "string" && (EXCHANGE_STATUSES as string[]).includes(raw)
      ? (raw as ExchangeStatus)
      : hasBrief
        ? "off"
        : "idle";
  const reply1 = readText(o.reply1, CAP.reply);
  const answer = readText(o.answer, CAP.reply);
  let reply2 = readText(o.reply2, CAP.reply);
  if (status === "streaming1") status = "off";
  if (status === "streaming2") {
    status = "off";
    reply2 = undefined;
  }
  if (status === "idle" && hasBrief) status = "off";
  if (!hasBrief) return NO_EXCHANGE;
  if ((status === "awaiting" || status === "done") && !reply1) status = "off";
  return { status, reply1, answer, reply2 };
}

/**
 * Anything in storage is untrusted input, a stale schema, a half-written
 * value, another tab's experiment. Rebuild the draft field by field so a
 * corrupt entry can only ever be ignored.
 */
function parseDraft(raw: string): StoredDraft | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const a = (
    d.answers && typeof d.answers === "object" ? d.answers : {}
  ) as Record<string, unknown>;
  const brief = readText(a.brief, CAP.brief);
  return {
    answers: {
      type: readPick(a.type),
      contact: readText(a.contact, CAP.contact),
      brief,
      budget: readPick(a.budget),
      timeline: readPick(a.timeline),
    },
    briefDraft: typeof d.briefDraft === "string" ? d.briefDraft.slice(0, CAP.brief) : "",
    contactDraft:
      typeof d.contactDraft === "string" ? d.contactDraft.slice(0, CAP.contact) : "",
    exchange: readExchange(d.exchange, !!brief),
    answerDraft:
      typeof d.answerDraft === "string" ? d.answerDraft.slice(0, CAP.reply) : "",
  };
}

/** The 4-pointed star that opens every NOVA line: 12px, currentColor. */
function StarGlyph({ pulse = false }: { pulse?: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      className={`mt-2 shrink-0 text-nova-soft ${pulse ? "motion-safe:animate-pulse" : ""}`}
      aria-hidden
    >
      <path
        d="M6 0C6.4 3.6 8.4 5.6 12 6 8.4 6.4 6.4 8.4 6 12 5.6 8.4 3.6 6.4 0 6 3.6 5.6 5.6 3.6 6 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NovaBubble({
  children,
  id,
  pulse,
}: {
  children: React.ReactNode;
  id?: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <StarGlyph pulse={pulse} />
      <div id={id} className="t-body min-w-0 text-ink-soft">
        {children}
      </div>
    </div>
  );
}

/**
 * A NOVA line that is still arriving. Until the first byte it shows the
 * thinking label; the star pulses for as long as the stream is open. The
 * text is deliberately NOT in a live region: the polite region announces
 * the finished reply once.
 */
function StreamingLine({
  text,
  thinking,
  groupRef,
}: {
  text: string;
  thinking: string;
  groupRef: (el: HTMLElement | null) => void;
}) {
  return (
    <div ref={groupRef} tabIndex={-1}>
      <NovaBubble pulse>
        {text ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <span className="text-muted">{thinking}</span>
        )}
      </NovaBubble>
    </div>
  );
}

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="t-body text-end text-ink">{children}</p>
    </div>
  );
}

function Chips({
  options,
  onPick,
  labelledBy,
  groupRef,
}: {
  options: readonly Pick[];
  onPick: (o: Pick) => void;
  labelledBy: string;
  groupRef: (el: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={groupRef}
      tabIndex={-1}
      role="group"
      aria-labelledby={labelledBy}
      className="ms-6 flex flex-wrap gap-2"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onPick(o)}
          className="t-label rounded-full border border-line px-4 py-2.5 text-ink-soft transition hover:border-line-strong hover:text-ink focus-visible:border-line-strong focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function NovaChat() {
  const { t, locale } = useApp();
  const n = t.nova;
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<Phase>("flow");
  const [delivered, setDelivered] = useState(false);
  const [briefDraft, setBriefDraft] = useState("");
  const [contactDraft, setContactDraft] = useState("");
  const [exchange, setExchange] = useState<Exchange>(NO_EXCHANGE);
  const [answerDraft, setAnswerDraft] = useState("");
  /** The reply currently arriving; committed into `exchange` when it ends. */
  const [streamText, setStreamText] = useState("");
  const [fieldFocused, setFieldFocused] = useState(false);
  const { run: runNova, abort: abortNova } = useNovaTurn();
  const honeypotRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const firstRunRef = useRef(true);
  const persistedOnceRef = useRef(false);
  /**
   * The container of whatever NOVA just revealed, the focus target. A ref
   * callback rather than a ref object because the target is a <div> on some
   * steps and a <form> on the contact step.
   */
  const activeRef = useRef<HTMLElement | null>(null);
  const setActive = (el: HTMLElement | null) => {
    activeRef.current = el;
  };
  /**
   * Focus only follows a real answer. Without this the chat would steal focus
   * on mount (and again on every draft restore) from a visitor who never
   * touched it.
   */
  const focusNextRef = useRef(false);

  /**
   * The exchange holds the flow at the brief until it closes: while it is
   * open the active step is the brief (already answered, so its user line
   * shows) and nothing after it is visible.
   */
  const streaming =
    exchange.status === "streaming1" || exchange.status === "streaming2";
  const exchangeOpen =
    !!answers.brief && exchange.status !== "done" && exchange.status !== "off";
  const firstUnanswered = STEPS.findIndex((s) => !answers[s.id]);
  const activeIndex = exchangeOpen
    ? STEPS.findIndex((s) => s.id === "brief")
    : firstUnanswered;
  const step: StepId | "recap" =
    activeIndex === -1 ? "recap" : STEPS[activeIndex].id;
  const visibleCount = activeIndex === -1 ? STEPS.length : activeIndex + 1;

  const mood: BotMood =
    phase === "sending" || streaming
      ? "thinking"
      : phase === "sent"
        ? "happy"
        : fieldFocused
          ? "listening"
          : "idle";

  const answerLabel = (id: StepId): string => {
    const v = answers[id];
    return typeof v === "string" ? v : (v?.label ?? "");
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  /**
   * Restore an interrupted brief. A mobile tab-switch used to destroy three
   * typed paragraphs; the answers AND the half-typed drafts come back.
   * This has to be an effect: sessionStorage is client-only (and throws
   * outright in Safari private mode), so reading it during render would both
   * crash there and desync hydration.
   */
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(DRAFT_KEY);
    } catch {}
    if (!raw) return;
    const saved = parseDraft(raw);
    if (!saved) return;
    /* eslint-disable react-hooks/set-state-in-effect --
       client-only sessionStorage restore; the server cannot know a visitor's
       in-progress brief, so reading it during render would desync hydration */
    setAnswers(saved.answers);
    setBriefDraft(saved.briefDraft);
    setContactDraft(saved.contactDraft);
    setExchange(saved.exchange);
    setAnswerDraft(saved.answerDraft);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist on every change. The first run is the mount pass, whose state is
  // still the pre-restore blank, writing it would erase the very draft the
  // effect above is restoring.
  useEffect(() => {
    if (!persistedOnceRef.current) {
      persistedOnceRef.current = true;
      return;
    }
    const empty =
      !answers.type &&
      !answers.contact &&
      !answers.brief &&
      !answers.budget &&
      !answers.timeline &&
      !briefDraft &&
      !contactDraft &&
      exchange.status === "idle" &&
      !answerDraft;
    if (empty) {
      clearDraft();
      return;
    }
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          answers,
          briefDraft,
          contactDraft,
          exchange,
          answerDraft,
        }),
      );
    } catch {}
  }, [answers, briefDraft, contactDraft, exchange, answerDraft]);

  /**
   * Keep the newest message in view by scrolling the thread's OWN box.
   * `scrollIntoView` must never be used here: it walks up and scrolls every
   * scrollable ancestor, so on mount it dragged the whole document down to
   * the chat, visitors landed at the bottom of the site, past the intro,
   * with the star already in its final pose. The first run is skipped too.
   */
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const thread = threadRef.current;
    if (thread) {
      thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
    }
  }, [step, phase, exchange.status]);

  // A reply that is still arriving grows the thread a frame at a time; keep
  // its tail in view without the smooth easing fighting every chunk.
  useEffect(() => {
    if (!streamText) return;
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [streamText]);

  /**
   * Answering unmounts the control that was focused, which drops focus to
   * <body>, 14 tab presses from the next question. Hand focus to the newly
   * revealed step instead. `preventScroll` is not optional: focusing inside
   * the thread would otherwise scroll every ancestor, which is exactly the
   * documented bug the effect above exists to avoid. Nothing is trapped: the
   * container is tabIndex={-1}, so Tab and Shift+Tab leave normally.
   */
  useEffect(() => {
    if (!focusNextRef.current) return;
    focusNextRef.current = false;
    activeRef.current?.focus({ preventScroll: true });
  }, [step, phase, exchange.status]);

  const answerPick = (id: ChipField, o: Pick) => {
    focusNextRef.current = true;
    setAnswers((a) => ({ ...a, [id]: o }));
  };

  /** Mirrors the API's zod contract (contact: min 3) so a too-short answer is
   *  refused at the step that asks for it, not with a 400 after the recap. */
  const MIN_TEXT: Record<TextField, number> = { brief: 1, contact: 3 };

  const answerText = (id: TextField, value: string) => {
    const v = value.trim();
    if (v.length < MIN_TEXT[id]) return;
    focusNextRef.current = true;
    setAnswers((a) => ({ ...a, [id]: v }));
  };

  /**
   * One live turn. Turn 1 ends in "awaiting" (the visitor may answer or
   * skip); turn 2 ends in "done". Any failure is silent: turn 1 falls to
   * "off" and the budget chips appear as they always did, turn 2 keeps the
   * visitor's answer and simply has no second reply. An aborted run (reset,
   * unmount) touches nothing.
   */
  const runTurn = async (turn: 1 | 2, messages: NovaMessage[]) => {
    setStreamText("");
    setExchange((x) => ({
      ...x,
      status: turn === 1 ? "streaming1" : "streaming2",
    }));
    const r = await runNova({ locale, turn, messages }, setStreamText);
    if (!r.ok && r.aborted) return;
    focusNextRef.current = true;
    setStreamText("");
    setExchange((x) => {
      if (turn === 1) {
        return r.ok
          ? { ...x, reply1: r.text, status: "awaiting" }
          : { ...x, status: "off" };
      }
      return r.ok
        ? { ...x, reply2: r.text, status: "done" }
        : { ...x, status: "done" };
    });
  };

  const submitBrief = () => {
    const v = briefDraft.trim();
    if (v.length < MIN_TEXT.brief) return;
    focusNextRef.current = true;
    setAnswers((a) => ({ ...a, brief: v }));
    void runTurn(1, [{ role: "user", content: v.slice(0, CAP.reply) }]);
  };

  const skipAnswer = () => {
    focusNextRef.current = true;
    setAnswerDraft("");
    setExchange((x) => ({ ...x, status: "done" }));
  };

  const submitAnswer = () => {
    const v = answerDraft.trim();
    if (!v || !answers.brief || !exchange.reply1) return;
    focusNextRef.current = true;
    setAnswerDraft("");
    setExchange((x) => ({ ...x, answer: v }));
    void runTurn(2, [
      { role: "user", content: answers.brief.slice(0, CAP.reply) },
      { role: "assistant", content: exchange.reply1.slice(0, CAP.reply) },
      { role: "user", content: v.slice(0, CAP.reply) },
    ]);
  };

  /** The live exchange as plain text, for the founder's copy of the brief. */
  const conversation = (): string | undefined => {
    if (!exchange.reply1) return undefined;
    const lines = [`NOVA: ${exchange.reply1}`];
    if (exchange.answer) lines.push(`Visitor: ${exchange.answer}`);
    if (exchange.reply2) lines.push(`NOVA: ${exchange.reply2}`);
    return lines.join("\n");
  };

  const reset = () => {
    abortNova();
    focusNextRef.current = true;
    setAnswers({});
    setBriefDraft("");
    setContactDraft("");
    setExchange(NO_EXCHANGE);
    setAnswerDraft("");
    setStreamText("");
    setDelivered(false);
    setPhase("flow");
    clearDraft();
  };

  const send = async () => {
    focusNextRef.current = true;
    setPhase("sending");
    try {
      const transcript = conversation();
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: answers.type?.label ?? "",
          brief: answers.brief ?? "",
          budget: answers.budget?.label ?? "",
          timeline: answers.timeline?.label ?? "",
          contact: answers.contact ?? "",
          locale,
          website: honeypotRef.current?.value ?? "",
          ...(transcript ? { conversation: transcript } : {}),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { ok: boolean; delivered: boolean };
      if (!data.ok) throw new Error("not ok");
      setDelivered(data.delivered);
      focusNextRef.current = true;
      setPhase("sent");
      // The brief is with the founder: the draft has done its job.
      clearDraft();
    } catch {
      focusNextRef.current = true;
      setPhase("error");
    }
  };

  const mailtoHref = () => {
    const subject = `${n.name}: ${answers.type?.label ?? ""}`;
    const body: string[] = [
      `${n.recap.typeLabel}: ${answers.type?.label ?? ""}`,
      `${n.recap.contactLabel}: ${answers.contact ?? ""}`,
      `${n.recap.budgetLabel}: ${answers.budget?.label ?? ""}`,
      `${n.recap.timelineLabel}: ${answers.timeline?.label ?? ""}`,
      "",
      answers.brief ?? "",
    ];
    const transcript = conversation();
    if (transcript) body.push("", transcript);
    return `mailto:${t.sections.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.join("\n"))}`;
  };

  /**
   * NOVA's newest line, and only that line. The thread itself must never be a
   * live region: every render would re-announce the whole conversation.
   */
  const announcement =
    phase === "sending"
      ? n.sending
      : phase === "sent"
        ? `${n.sentTitle} ${delivered ? n.sentBody : n.fallbackNote}`
        : phase === "error"
          ? n.errorNote
          : streaming
            ? n.ai.thinking
            : exchange.status === "awaiting"
              ? (exchange.reply1 ?? "")
              : step === "recap"
                ? `${n.recap.title} ${n.recap.confirm}`
                : step === "budget" && exchange.reply2
                  ? `${exchange.reply2} ${n.steps.budget.q}`
                  : n.steps[step].q;

  /** The exchange has something to show once a reply exists or is arriving. */
  const showExchange =
    exchange.status === "streaming1" || !!exchange.reply1;

  return (
    <div className="text-start">
      {/* header: the terminal's title line on a rule that carries meaning */}
      <div className="rule-strong flex items-center justify-between gap-4 pt-3 pb-6">
        <div className="flex items-center gap-4">
          <NovaBot mood={mood} />
          <p className="t-label text-muted" dir="ltr">
            {t.sections.contact.terminalHeader}
          </p>
        </div>
        <p className="t-label text-nova-soft">{n.name}</p>
      </div>

      {/* thread */}
      <div
        ref={threadRef}
        className="flex max-h-[min(62svh,520px)] flex-col gap-5 overflow-y-auto pe-2"
        onFocus={(e) => setFieldFocused(isTextField(e.target))}
        onBlur={() => setFieldFocused(false)}
      >
        <NovaBubble>{n.greeting}</NovaBubble>

        {STEPS.slice(0, visibleCount).map((s, i) => {
          const qid = `nova-q-${s.id}`;
          const active = i === activeIndex;
          const content = n.steps[s.id];
          return (
            <Fragment key={s.id}>
              <NovaBubble id={qid}>{content.q}</NovaBubble>
              {!active || answers[s.id] ? (
                <UserBubble>{answerLabel(s.id)}</UserBubble>
              ) : s.kind === "chips" ? (
                <Chips
                  options={n.steps[s.id].options}
                  onPick={(o) => answerPick(s.id, o)}
                  labelledBy={qid}
                  groupRef={setActive}
                />
              ) : s.kind === "area" ? (
                <div
                  ref={setActive}
                  tabIndex={-1}
                  className="ms-6 flex flex-col gap-4"
                >
                  {/* A bottom rule is the whole field; the caret is the prompt. */}
                  <div className="flex items-start gap-2 border-b border-line transition-colors focus-within:border-nova-soft">
                    <span className="caret mt-2 shrink-0 text-sm" aria-hidden />
                    <textarea
                      value={briefDraft}
                      onChange={(e) => setBriefDraft(e.target.value)}
                      aria-labelledby={qid}
                      placeholder={n.steps.brief.placeholder}
                      rows={3}
                      maxLength={CAP.brief}
                      className="w-full resize-none bg-transparent py-2 text-[1.0625rem] leading-relaxed text-ink outline-none placeholder:text-muted/60"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!briefDraft.trim()}
                    onClick={submitBrief}
                    className="self-end rounded-full bg-cta px-5 py-2.5 text-sm font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
                  >
                    {n.steps.brief.next}
                  </button>
                </div>
              ) : (
                <form
                  ref={setActive}
                  tabIndex={-1}
                  className="ms-6 flex flex-col gap-4 sm:flex-row sm:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    answerText("contact", contactDraft);
                  }}
                >
                  <div className="flex w-full min-w-0 items-center gap-2 border-b border-line transition-colors focus-within:border-nova-soft">
                    <span className="caret shrink-0 text-sm" aria-hidden />
                    <input
                      value={contactDraft}
                      onChange={(e) => setContactDraft(e.target.value)}
                      aria-labelledby={qid}
                      placeholder={n.steps.contact.placeholder}
                      maxLength={CAP.contact}
                      className="w-full bg-transparent py-2 text-[1.0625rem] text-ink outline-none placeholder:text-muted/60"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={contactDraft.trim().length < 3}
                    className="shrink-0 self-end rounded-full bg-cta px-5 py-2.5 text-sm font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
                  >
                    {/* The brief is not sent here any more, this step now sits
                        second, so it advances the conversation. */}
                    {n.steps.brief.next}
                  </button>
                </form>
              )}

              {/* the live turn: NOVA reads the brief and asks one question */}
              {s.id === "brief" && showExchange && (
                <>
                  {exchange.status === "streaming1" ? (
                    <StreamingLine
                      text={streamText}
                      thinking={n.ai.thinking}
                      groupRef={setActive}
                    />
                  ) : (
                    exchange.reply1 && (
                      <NovaBubble id="nova-q-ai">
                        <p className="whitespace-pre-wrap">{exchange.reply1}</p>
                      </NovaBubble>
                    )
                  )}
                  {exchange.answer && <UserBubble>{exchange.answer}</UserBubble>}
                  {exchange.status === "awaiting" && (
                    <form
                      ref={setActive}
                      tabIndex={-1}
                      className="ms-6 flex flex-col gap-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitAnswer();
                      }}
                    >
                      <div className="flex w-full min-w-0 items-center gap-2 border-b border-line transition-colors focus-within:border-nova-soft">
                        <span className="caret shrink-0 text-sm" aria-hidden />
                        <input
                          value={answerDraft}
                          onChange={(e) => setAnswerDraft(e.target.value)}
                          aria-labelledby="nova-q-ai"
                          placeholder={n.ai.answerPlaceholder}
                          maxLength={CAP.reply}
                          className="w-full bg-transparent py-2 text-[1.0625rem] text-ink outline-none placeholder:text-muted/60"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={skipAnswer}
                          className="t-label rounded-full border border-line px-4 py-2.5 text-ink-soft transition hover:border-line-strong hover:text-ink focus-visible:border-line-strong focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
                        >
                          {n.ai.skip}
                        </button>
                        <button
                          type="submit"
                          disabled={!answerDraft.trim()}
                          className="rounded-full bg-cta px-5 py-2.5 text-sm font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
                        >
                          {n.steps.brief.next}
                        </button>
                      </div>
                    </form>
                  )}
                  {exchange.status === "streaming2" ? (
                    <StreamingLine
                      text={streamText}
                      thinking={n.ai.thinking}
                      groupRef={setActive}
                    />
                  ) : (
                    exchange.reply2 && (
                      <NovaBubble>
                        <p className="whitespace-pre-wrap">{exchange.reply2}</p>
                      </NovaBubble>
                    )
                  )}
                </>
              )}
            </Fragment>
          );
        })}

        {step === "recap" && phase === "flow" && (
          <div
            ref={setActive}
            tabIndex={-1}
            role="group"
            aria-labelledby="nova-recap-title"
            className="ms-6"
          >
            <p id="nova-recap-title" className="t-label text-nova-soft">
              {n.recap.title}
            </p>
            <dl className="mt-4">
              {(
                [
                  [n.recap.typeLabel, answers.type?.label, false],
                  [n.recap.contactLabel, answers.contact, false],
                  [n.recap.briefLabel, answers.brief, true],
                  [n.recap.budgetLabel, answers.budget?.label, false],
                  [n.recap.timelineLabel, answers.timeline?.label, false],
                ] as const
              ).map(([k, v, clamp]) => (
                <div
                  key={k}
                  className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-4 border-t border-line py-3"
                >
                  <dt className="t-label pt-1 text-muted">{k}</dt>
                  <dd
                    className={`t-small min-w-0 text-ink ${clamp ? "line-clamp-3" : ""}`}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <button
                type="button"
                onClick={send}
                className="rounded-full bg-cta px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
              >
                {n.recap.confirm}
              </button>
              <button
                type="button"
                onClick={reset}
                className="t-label rounded-full border border-line px-5 py-3 text-ink-soft transition hover:border-line-strong hover:text-ink focus-visible:border-line-strong focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
              >
                {n.recap.edit}
              </button>
            </div>
          </div>
        )}

        {phase === "sending" && (
          <div ref={setActive} tabIndex={-1}>
            <NovaBubble>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-nova motion-safe:animate-pulse" />
                {n.sending}
              </span>
            </NovaBubble>
          </div>
        )}

        {phase === "sent" && (
          <div ref={setActive} tabIndex={-1}>
            <NovaBubble>
              <p className="text-ink">{n.sentTitle}</p>
              <p className="mt-1 text-muted">
                {delivered ? n.sentBody : n.fallbackNote}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {!delivered && (
                  <a
                    href={mailtoHref()}
                    className="inline-block rounded-full bg-cta px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
                  >
                    {n.fallbackCta}
                  </a>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="t-label text-muted underline-offset-4 transition hover:text-ink hover:underline"
                >
                  {n.restart}
                </button>
              </div>
            </NovaBubble>
          </div>
        )}

        {phase === "error" && (
          <div ref={setActive} tabIndex={-1}>
            <NovaBubble>
              <p>{n.errorNote}</p>
              <button
                type="button"
                onClick={send}
                className="t-label mt-4 rounded-full border border-line px-5 py-3 text-ink-soft transition hover:border-line-strong hover:text-ink focus-visible:border-line-strong focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nova-soft"
              >
                {n.recap.confirm}
              </button>
            </NovaBubble>
          </div>
        )}
      </div>

      {/* One polite region, always mounted, carrying only NOVA's latest line. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* honeypot */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />
    </div>
  );
}
