"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";

type Pick = { id: string; label: string };
interface Answers {
  type?: Pick;
  brief?: string;
  budget?: Pick;
  timeline?: Pick;
  contact?: string;
}
type Phase = "flow" | "sending" | "sent" | "error";

function NovaBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-nova/40 bg-nova/10">
        <svg viewBox={STAR_GLYPH_VIEWBOX} className="h-4 w-auto" aria-hidden>
          <path d={STAR_GLYPH_PATH} fill="#9CC5FF" />
        </svg>
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-ss-sm border border-line bg-surface/70 px-4 py-3 text-sm leading-6 text-ink/90">
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
}: {
  options: Pick[];
  onPick: (o: Pick) => void;
}) {
  return (
    <div className="ms-10 flex flex-wrap gap-2">
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
  const endRef = useRef<HTMLDivElement>(null);

  const step = !answers.type
    ? "type"
    : !answers.brief
      ? "brief"
      : !answers.budget
        ? "budget"
        : !answers.timeline
          ? "timeline"
          : !answers.contact
            ? "contact"
            : "recap";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step, phase]);

  const reset = () => {
    setAnswers({});
    setBriefDraft("");
    setContactDraft("");
    setDelivered(false);
    setPhase("flow");
  };

  const send = async () => {
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
      setPhase("sent");
    } catch {
      setPhase("error");
    }
  };

  const mailtoHref = () => {
    const subject = `${n.name} — ${answers.type?.label ?? ""}`;
    const body = [
      `${n.recap.typeLabel}: ${answers.type?.label ?? ""}`,
      `${n.recap.budgetLabel}: ${answers.budget?.label ?? ""}`,
      `${n.recap.timelineLabel}: ${answers.timeline?.label ?? ""}`,
      `${n.recap.contactLabel}: ${answers.contact ?? ""}`,
      "",
      answers.brief ?? "",
    ].join("\n");
    return `mailto:${t.sections.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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
      <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pe-1 text-start">
        <NovaBubble>{n.greeting}</NovaBubble>
        <NovaBubble>{n.steps.type.q}</NovaBubble>
        {answers.type ? (
          <UserBubble>{answers.type.label}</UserBubble>
        ) : (
          <Chips
            options={n.steps.type.options}
            onPick={(o) => setAnswers((a) => ({ ...a, type: o }))}
          />
        )}

        {answers.type && (
          <>
            <NovaBubble>{n.steps.brief.q}</NovaBubble>
            {answers.brief ? (
              <UserBubble>{answers.brief}</UserBubble>
            ) : (
              <div className="ms-10 flex flex-col gap-2">
                <textarea
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  placeholder={n.steps.brief.placeholder}
                  rows={3}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-line bg-surface/70 px-4 py-3 text-sm text-ink placeholder:text-muted/60 focus:border-nova/50 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!briefDraft.trim()}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, brief: briefDraft.trim() }))
                  }
                  className="self-end rounded-full bg-nova px-5 py-2 text-sm font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-40"
                >
                  {n.steps.brief.next}
                </button>
              </div>
            )}
          </>
        )}

        {answers.brief && (
          <>
            <NovaBubble>{n.steps.budget.q}</NovaBubble>
            {answers.budget ? (
              <UserBubble>{answers.budget.label}</UserBubble>
            ) : (
              <Chips
                options={n.steps.budget.options}
                onPick={(o) => setAnswers((a) => ({ ...a, budget: o }))}
              />
            )}
          </>
        )}

        {answers.budget && (
          <>
            <NovaBubble>{n.steps.timeline.q}</NovaBubble>
            {answers.timeline ? (
              <UserBubble>{answers.timeline.label}</UserBubble>
            ) : (
              <Chips
                options={n.steps.timeline.options}
                onPick={(o) => setAnswers((a) => ({ ...a, timeline: o }))}
              />
            )}
          </>
        )}

        {answers.timeline && (
          <>
            <NovaBubble>{n.steps.contact.q}</NovaBubble>
            {answers.contact ? (
              <UserBubble>{answers.contact}</UserBubble>
            ) : (
              <form
                className="ms-10 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (contactDraft.trim())
                    setAnswers((a) => ({ ...a, contact: contactDraft.trim() }));
                }}
              >
                <input
                  value={contactDraft}
                  onChange={(e) => setContactDraft(e.target.value)}
                  placeholder={n.steps.contact.placeholder}
                  maxLength={200}
                  className="w-full rounded-full border border-line bg-surface/70 px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-nova/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!contactDraft.trim()}
                  className="shrink-0 rounded-full bg-nova px-5 py-2 text-sm font-medium text-white transition enabled:hover:brightness-110 disabled:opacity-40"
                >
                  {n.steps.contact.send}
                </button>
              </form>
            )}
          </>
        )}

        {step === "recap" && phase === "flow" && (
          <div className="ms-10 rounded-2xl border border-nova/30 bg-surface/60 p-4">
            <p className="font-mono text-xs tracking-[0.2em] text-nova-soft">
              {n.recap.title}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {(
                [
                  [n.recap.typeLabel, answers.type?.label],
                  [n.recap.budgetLabel, answers.budget?.label],
                  [n.recap.timelineLabel, answers.timeline?.label],
                  [n.recap.contactLabel, answers.contact],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted">{k}:</dt>
                  <dd className="text-ink/90">{v}</dd>
                </div>
              ))}
              <div className="flex gap-2">
                <dt className="text-muted">{n.recap.briefLabel}:</dt>
                <dd className="line-clamp-3 text-ink/90">{answers.brief}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={send}
                className="rounded-full bg-nova px-6 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgb(10_132_255/35%)] transition hover:brightness-110"
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
          <NovaBubble>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nova" />
              {n.sending}
            </span>
          </NovaBubble>
        )}

        {phase === "sent" && (
          <NovaBubble>
            <p className="font-medium text-ink">{n.sentTitle}</p>
            <p className="mt-1 text-muted">
              {delivered ? n.sentBody : n.fallbackNote}
            </p>
            {!delivered && (
              <a
                href={mailtoHref()}
                className="mt-3 inline-block rounded-full bg-nova px-5 py-2 text-sm font-medium text-white transition hover:brightness-110"
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
        )}

        {phase === "error" && (
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
        )}

        <div ref={endRef} />
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
