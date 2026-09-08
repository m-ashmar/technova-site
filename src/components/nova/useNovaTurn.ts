"use client";

import { useCallback, useEffect, useRef } from "react";

export type NovaRole = "user" | "assistant";
export interface NovaMessage {
  role: NovaRole;
  content: string;
}
export interface NovaContext {
  type: string;
  budget: string;
  timeline: string;
}
/** What the chat should do after a reply: ask the visitor again, or move to the guided steps. */
export type NovaNext = "ask" | "ready";
export interface NovaTurnRequest {
  locale: "en" | "ar";
  kind: "chat";
  /** Starts with the visitor, alternates strictly, ends with the visitor: 1 to 7 messages. */
  messages: NovaMessage[];
  /** The session pass the previous call handed out; absent on the first call only. */
  pass?: string;
}
export interface NovaSummaryRequest {
  locale: "en" | "ar";
  /** The whole chat thread, 2 to 8 messages, ending with either role. */
  messages: NovaMessage[];
  context: NovaContext;
  pass: string;
}
export type NovaFailure = { ok: false; aborted: boolean };
export type NovaTurnResult =
  | { ok: true; text: string; next: NovaNext; pass?: string }
  | NovaFailure;
export type NovaSummaryResult =
  | { ok: true; text: string; pass?: string }
  | NovaFailure;

const PASS_HEADER = "x-nova-pass";
/**
 * After the reply text the server appends, each as "\n" + NUL + marker:
 * "next:" + ("ask" | "ready") on chat calls, then "pass:" + token last.
 */
const NUL = "\u0000";
const NEXT_MARKER = "next:";
const PASS_MARKER = "pass:";
const PASS_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

interface Framed {
  text: string;
  next?: NovaNext;
  pass?: string;
}

/**
 * Split the raw stream into the visible reply and the trailing markers that
 * have arrived. NUL is a single byte and never occurs in model text, so the
 * cut point is unambiguous even when a marker straddles two chunks: the
 * text before the first NUL is safe to show, everything after it is held.
 */
function split(raw: string): Framed {
  const nul = raw.indexOf(NUL);
  if (nul < 0) return { text: raw };
  const out: Framed = { text: raw.slice(0, nul).replace(/\n$/, "") };
  for (const segment of raw.slice(nul + 1).split(NUL)) {
    if (segment.startsWith(NEXT_MARKER)) {
      const next = segment.slice(NEXT_MARKER.length).trim();
      if (next === "ask" || next === "ready") out.next = next;
    } else if (segment.startsWith(PASS_MARKER)) {
      const pass = segment.slice(PASS_MARKER.length).trim();
      if (PASS_SHAPE.test(pass)) out.pass = pass;
    }
  }
  return out;
}

/**
 * Live NOVA calls against POST /api/nova. The reply streams back as raw
 * UTF-8 text with the next-step marker (chat only) and the advanced session
 * pass framed after NUL markers at the end; the hook strips the markers and
 * returns them alongside the text.
 *
 * `run` handles the chat calls: `onText` receives the visible text so far,
 * at most once per animation frame, so a fast stream never floods React with
 * renders, and the result says whether NOVA wants to ask again or is ready
 * for the guided steps. `runSummary` handles the brief and resolves with the
 * whole text at once.
 *
 * Failure is silent by design: the caller falls back to the scripted flow.
 * Every non-2xx status (401 and 409 included) is a plain failure. The hook
 * owns a single AbortController, so starting a call cancels the previous
 * one, and unmount cancels whatever is in flight.
 */
export function useNovaTurn() {
  const ctrlRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
  }, []);

  useEffect(() => abort, [abort]);

  const request = useCallback(
    async (
      body: Record<string, unknown>,
      pass: string | undefined,
      onText?: (text: string) => void,
    ): Promise<Framed | NovaFailure> => {
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      const { signal } = ctrl;

      let raw = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        if (!signal.aborted) onText?.(split(raw).text);
      };
      const schedule = () => {
        if (onText && !raf) raf = requestAnimationFrame(flush);
      };

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (pass) headers[PASS_HEADER] = pass;
        const res = await fetch("/api/nova", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal,
        });
        if (!res.ok || !res.body) return { ok: false, aborted: false };

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          schedule();
        }
        raw += decoder.decode();
      } catch {
        if (raf) cancelAnimationFrame(raf);
        if (signal.aborted) return { ok: false, aborted: true };
        // A stream that broke after some bytes still said something worth
        // keeping; only an empty result counts as a failure.
        if (!split(raw).text.trim()) return { ok: false, aborted: false };
      }

      if (raf) cancelAnimationFrame(raf);
      if (signal.aborted) return { ok: false, aborted: true };
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
      const out = split(raw);
      if (!out.text.trim()) return { ok: false, aborted: false };
      onText?.(out.text);
      return out;
    },
    [],
  );

  const run = useCallback(
    async (req: NovaTurnRequest, onText: (text: string) => void): Promise<NovaTurnResult> => {
      const { pass, ...body } = req;
      const out = await request(body, pass, onText);
      if ("ok" in out) return out;
      // A stream cut before its markers cannot continue anyway: treat it as ready.
      const result: NovaTurnResult = { ok: true, text: out.text, next: out.next ?? "ready" };
      return out.pass ? { ...result, pass: out.pass } : result;
    },
    [request],
  );

  const runSummary = useCallback(
    async (req: NovaSummaryRequest): Promise<NovaSummaryResult> => {
      const { pass, ...rest } = req;
      const out = await request({ ...rest, kind: "brief" }, pass);
      if ("ok" in out) return out;
      return out.pass ? { ok: true, text: out.text, pass: out.pass } : { ok: true, text: out.text };
    },
    [request],
  );

  return { run, runSummary, abort };
}
