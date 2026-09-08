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
export interface NovaTurnRequest {
  locale: "en" | "ar";
  turn: 1 | 2;
  messages: NovaMessage[];
  /** The session pass the previous turn handed out; absent on turn 1. */
  pass?: string;
}
export interface NovaSummaryRequest {
  locale: "en" | "ar";
  messages: NovaMessage[];
  context: NovaContext;
  pass: string;
}
export type NovaTurnResult =
  | { ok: true; text: string; pass?: string }
  | { ok: false; aborted: boolean };

const PASS_HEADER = "x-nova-pass";
/** The server appends "\n" + NUL + "pass:" + token as the final chunk. */
const NUL = "\u0000";
const PASS_MARKER = `${NUL}pass:`;
const PASS_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Split the raw stream into the visible reply and the pass, if the marker
 * has arrived. NUL is a single byte and never occurs in model text, so the
 * cut point is unambiguous even when the marker straddles two chunks: the
 * text before the first NUL is safe to show, everything after it is held.
 */
function split(raw: string): { text: string; pass?: string } {
  const nul = raw.indexOf(NUL);
  if (nul < 0) return { text: raw };
  const text = raw.slice(0, nul).replace(/\n$/, "");
  const tail = raw.slice(nul);
  if (!tail.startsWith(PASS_MARKER)) return { text };
  const pass = tail.slice(PASS_MARKER.length).trim();
  return PASS_SHAPE.test(pass) ? { text, pass } : { text };
}

/**
 * Live NOVA calls against POST /api/nova. The reply streams back as raw
 * UTF-8 text with the advanced session pass framed after a NUL marker at the
 * end; the hook strips the marker and returns the pass alongside the text.
 *
 * `run` handles turns 1 and 2: `onText` receives the visible text so far, at
 * most once per animation frame, so a fast stream never floods React with
 * renders. `runSummary` handles turn 3, the brief, and resolves with the
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
    ): Promise<NovaTurnResult> => {
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
      return out.pass ? { ok: true, text: out.text, pass: out.pass } : { ok: true, text: out.text };
    },
    [],
  );

  const run = useCallback(
    (req: NovaTurnRequest, onText: (text: string) => void): Promise<NovaTurnResult> => {
      const { pass, ...body } = req;
      return request(body, pass, onText);
    },
    [request],
  );

  const runSummary = useCallback(
    (req: NovaSummaryRequest): Promise<NovaTurnResult> => {
      const { pass, ...rest } = req;
      return request({ ...rest, turn: 3 }, pass);
    },
    [request],
  );

  return { run, runSummary, abort };
}
