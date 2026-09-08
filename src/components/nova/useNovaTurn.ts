"use client";

import { useCallback, useEffect, useRef } from "react";

export type NovaRole = "user" | "assistant";
export interface NovaMessage {
  role: NovaRole;
  content: string;
}
export interface NovaTurnRequest {
  locale: "en" | "ar";
  turn: 1 | 2;
  messages: NovaMessage[];
}
export type NovaTurnResult =
  | { ok: true; text: string }
  | { ok: false; aborted: boolean };

/**
 * One live NOVA turn against POST /api/nova. The reply streams back as raw
 * UTF-8 text; `onText` receives the whole text so far, at most once per
 * animation frame, so a fast stream never floods React with renders.
 *
 * Failure is silent by design: the caller falls back to the scripted flow.
 * The hook owns a single AbortController, so starting a turn cancels the
 * previous one, and unmount cancels whatever is in flight.
 */
export function useNovaTurn() {
  const ctrlRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
  }, []);

  useEffect(() => abort, [abort]);

  const run = useCallback(
    async (
      req: NovaTurnRequest,
      onText: (text: string) => void,
    ): Promise<NovaTurnResult> => {
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      const { signal } = ctrl;

      let text = "";
      let raf = 0;
      const flush = () => {
        raf = 0;
        if (!signal.aborted) onText(text);
      };

      try {
        const res = await fetch("/api/nova", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
          signal,
        });
        if (!res.ok || !res.body) return { ok: false, aborted: false };

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          if (!raf) raf = requestAnimationFrame(flush);
        }
        text += decoder.decode();
      } catch {
        if (raf) cancelAnimationFrame(raf);
        if (signal.aborted) return { ok: false, aborted: true };
        // A stream that broke after some bytes still said something worth
        // keeping; only an empty result counts as a failure.
        if (!text.trim()) return { ok: false, aborted: false };
      }

      if (raf) cancelAnimationFrame(raf);
      if (signal.aborted) return { ok: false, aborted: true };
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
      if (!text.trim()) return { ok: false, aborted: false };
      onText(text);
      return { ok: true, text };
    },
    [],
  );

  return { run, abort };
}
