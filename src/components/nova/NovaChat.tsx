"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";

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
 * The funnel, in order — one entry per question, so the order lives in data
 * instead of in a chain of ternaries.
 *
 * Contact is SECOND on purpose. It used to be last, behind a required
 * multi-paragraph brief and two chip rows: anyone who hesitated at the budget
 * question left the founder nothing at all — no address, no partial record.
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
const CAP = { brief: 2000, contact: 200, label: 60 } as const;

interface StoredDraft {
  answers: Answers;
  briefDraft: string;
  contactDraft: string;
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
 * Anything in storage is untrusted input — a stale schema, a half-written
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
  return {
    answers: {
      type: readPick(a.type),
      contact: readText(a.contact, CAP.contact),
      brief: readText(a.brief, CAP.brief),
      budget: readPick(a.budget),
      timeline: readPick(a.timeline),
    },
    briefDraft: typeof d.briefDraft === "string" ? d.briefDraft.slice(0, CAP.brief) : "",
    contactDraft:
      typeof d.contactDraft === "string" ? d.contactDraft.slice(0, CAP.contact) : "",
  };
}

function NovaBubble({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-nova/40 bg-nova/10">
        <svg viewBox={STAR_GLYPH_VIEWBOX} className="h-4 w-auto" aria-hidden>
          <path d={STAR_GLYPH_PATH} fill="#9CC5FF" />
        </svg>
      </span>
      <div
        id={id}
        className="max-w-[85%] rounded-2xl rounded-ss-sm border border-line bg-surface/70 px-4 py-3 text-sm leading-6 text-ink/90"
      >
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-se-sm bg-nova/90 px-4 py-2.5 text-sm leading-6 text-white">
        {children}
      </div>
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
      className="ms-10 flex flex-wrap gap-2"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onPick(o)}
          className="rounded-full border border-nova/40 px-4 py-2 text-sm text-nova-soft transition hover:bg-nova/10 hover:text-ink"
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
  const honeypotRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const firstRunRef = useRef(true);
  const persistedOnceRef = useRef(false);
  /**
   * The container of whatever NOVA just revealed — the focus target. A ref
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

  const activeIndex = STEPS.findIndex((s) => !answers[s.id]);
  const step: StepId | "recap" =
    activeIndex === -1 ? "recap" : STEPS[activeIndex].id;
  const visibleCount = activeIndex === -1 ? STEPS.length : activeIndex + 1;

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
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist on every change. The first run is the mount pass, whose state is
  // still the pre-restore blank — writing it would erase the very draft the
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
      !contactDraft;
    if (empty) {
      clearDraft();
      return;
    }
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ answers, briefDraft, contactDraft }),
      );
    } catch {}
  }, [answers, briefDraft, contactDraft]);

  /**
   * Keep the newest message in view by scrolling the thread's OWN box.
   * `scrollIntoView` must never be used here: it walks up and scrolls every
   * scrollable ancestor, so on mount it dragged the whole document down to
   * the chat — visitors landed at the bottom of the site, past the intro,
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
  }, [step, phase]);

  /**
   * Answering unmounts the control that was focused, which drops focus to
   * <body> — 14 tab presses from the next question. Hand focus to the newly
   * revealed step instead. `preventScroll` is not optional: focusing inside
   * the thread would otherwise scroll every ancestor, which is exactly the
   * documented bug the effect above exists to avoid. Nothing is trapped: the
   * container is tabIndex={-1}, so Tab and Shift+Tab leave normally.
   */
  useEffect(() => {
    if (!focusNextRef.current) return;
    focusNextRef.current = false;
    activeRef.current?.focus({ preventScroll: true });
  }, [step, phase]);

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

  const reset = () => {
    focusNextRef.current = true;
    setAnswers({});
    setBriefDraft("");
    setContactDraft("");
    setDelivered(false);
    setPhase("flow");
    clearDraft();
  };

  const send = async () => {
    focusNextRef.current = true;
    setPhase("sending");
    try {
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
    const subject = `${n.name} — ${answers.type?.label ?? ""}`;
    const body = [
      `${n.recap.typeLabel}: ${answers.type?.label ?? ""}`,
      `${n.recap.contactLabel}: ${answers.contact ?? ""}`,
      `${n.recap.budgetLabel}: ${answers.budget?.label ?? ""}`,
      `${n.recap.timelineLabel}: ${answers.timeline?.label ?? ""}`,
      "",
      answers.brief ?? "",
    ].join("\n");
    return `mailto:${t.sections.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
          : step === "recap"
            ? `${n.recap.title} ${n.recap.confirm}`
            : n.steps[step].q;

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-line bg-bg/60 p-5 backdrop-blur-md sm:p-6">
      {/* header */}
      <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-nova/40 bg-nova/10">
          <svg viewBox={STAR_GLYPH_VIEWBOX} className="h-5 w-auto" aria-hidden>
            <path d={STAR_GLYPH_PATH} fill="#9CC5FF" />
          </svg>
          <span className="absolute -end-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-nova" />
        </span>
        <div className="text-start">
          <p className="font-display text-sm font-medium tracking-wide text-ink">
            {n.name}
          </p>
          <p className="text-xs text-muted">{n.tagline}</p>
        </div>
      </div>

      {/* thread */}
      <div
        ref={threadRef}
        className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pe-1 text-start"
      >
        <NovaBubble>{n.greeting}</NovaBubble>

        {STEPS.slice(0, visibleCount).map((s, i) => {
          const qid = `nova-q-${s.id}`;
          const active = i === activeIndex;
          const content = n.steps[s.id];
          return (
            <Fragment key={s.id}>
              <NovaBubble id={qid}>{content.q}</NovaBubble>
              {!active ? (
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
                  className="ms-10 flex flex-col gap-2"
                >
                  <textarea
                    value={briefDraft}
                    onChange={(e) => setBriefDraft(e.target.value)}
                    aria-labelledby={qid}
                    placeholder={n.steps.brief.placeholder}
                    rows={3}
                    maxLength={CAP.brief}
                    className="w-full resize-none rounded-xl border border-line bg-surface/70 px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-nova/50"
                  />
                  <button
                    type="button"
                    disabled={!briefDraft.trim()}
                    onClick={() => answerText("brief", briefDraft)}
                    className="self-end rounded-full bg-cta px-5 py-2 text-sm font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-40"
                  >
                    {n.steps.brief.next}
                  </button>
                </div>
              ) : (
                <form
                  ref={setActive}
                  tabIndex={-1}
                  className="ms-10 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    answerText("contact", contactDraft);
                  }}
                >
                  <input
                    value={contactDraft}
                    onChange={(e) => setContactDraft(e.target.value)}
                    aria-labelledby={qid}
                    placeholder={n.steps.contact.placeholder}
                    maxLength={CAP.contact}
                    className="w-full rounded-full border border-line bg-surface/70 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-nova/50"
                  />
                  <button
                    type="submit"
                    disabled={contactDraft.trim().length < 3}
                    className="shrink-0 rounded-full bg-cta px-5 py-2 text-sm font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-40"
                  >
                    {/* The brief is not sent here any more — this step now sits
                        second, so it advances the conversation. */}
                    {n.steps.brief.next}
                  </button>
                </form>
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
            className="ms-10 rounded-2xl border border-nova/30 bg-surface/60 p-4"
          >
            <p
              id="nova-recap-title"
              className="font-mono text-xs tracking-[0.2em] text-nova-soft"
            >
              {n.recap.title}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {(
                [
                  [n.recap.typeLabel, answers.type?.label, false],
                  [n.recap.contactLabel, answers.contact, false],
                  [n.recap.briefLabel, answers.brief, true],
                  [n.recap.budgetLabel, answers.budget?.label, false],
                  [n.recap.timelineLabel, answers.timeline?.label, false],
                ] as const
              ).map(([k, v, clamp]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted">{k}:</dt>
                  <dd className={clamp ? "line-clamp-3 text-ink/90" : "text-ink/90"}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={send}
                className="rounded-full bg-cta px-6 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgb(10_132_255/35%)] transition hover:brightness-110"
              >
                {n.recap.confirm}
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-line px-5 py-2.5 text-sm text-muted transition hover:text-ink"
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
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nova" />
                {n.sending}
              </span>
            </NovaBubble>
          </div>
        )}

        {phase === "sent" && (
          <div ref={setActive} tabIndex={-1}>
            <NovaBubble>
              <p className="font-medium text-ink">{n.sentTitle}</p>
              <p className="mt-1 text-muted">
                {delivered ? n.sentBody : n.fallbackNote}
              </p>
              {!delivered && (
                <a
                  href={mailtoHref()}
                  className="mt-3 inline-block rounded-full bg-cta px-5 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  {n.fallbackCta}
                </a>
              )}
              <button
                type="button"
                onClick={reset}
                className="mt-3 ms-3 text-xs text-muted underline-offset-4 transition hover:text-ink hover:underline"
              >
                {n.restart}
              </button>
            </NovaBubble>
          </div>
        )}

        {phase === "error" && (
          <div ref={setActive} tabIndex={-1}>
            <NovaBubble>
              <p className="text-ink/90">{n.errorNote}</p>
              <button
                type="button"
                onClick={send}
                className="mt-3 rounded-full border border-nova/40 px-5 py-2 text-sm text-nova-soft transition hover:bg-nova/10"
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
