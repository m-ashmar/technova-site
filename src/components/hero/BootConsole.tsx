"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The agent-log intro: types each line like a live terminal, then calls onDone.
 * Rendering is LTR (terminal aesthetic) but each line resolves its own
 * direction, so Arabic boot lines read correctly.
 */
export default function BootConsole({
  lines,
  onDone,
}: {
  lines: string[];
  onDone: () => void;
}) {
  const [li, setLi] = useState(0);
  const [ch, setCh] = useState(0);
  const done = li >= lines.length;
  const firedRef = useRef(false);
  const lineStartRef = useRef<number | null>(null);

  // Time-based typing (24ms/char + 240ms line gap) so throttled timers in
  // background tabs jump ahead instead of crawling one char per tick.
  useEffect(() => {
    if (done) return;
    const line = lines[li];
    if (lineStartRef.current === null) lineStartRef.current = performance.now();
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      // Hold the show for its audience: while the tab is hidden, freeze
      // progress so the birth plays when the visitor actually looks.
      if (document.hidden) {
        if (lineStartRef.current !== null) lineStartRef.current += dt;
        return;
      }
      const elapsed = now - (lineStartRef.current ?? 0);
      const chars = Math.min(line.length, Math.floor(elapsed / 24));
      setCh(chars);
      if (chars >= line.length && elapsed >= line.length * 24 + 240) {
        lineStartRef.current = null;
        setLi((l) => l + 1);
        setCh(0);
      }
    };
    const id = setInterval(tick, 30);
    tick();
    return () => clearInterval(id);
  }, [li, lines, done]);

  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      const id = setTimeout(onDone, 420);
      return () => clearTimeout(id);
    }
  }, [done, onDone]);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      dir="ltr"
    >
      <div className="min-w-[260px] font-mono text-[13px] leading-7 text-muted sm:text-sm">
        {lines.slice(0, Math.min(li + 1, lines.length)).map((l, i) => (
          <p key={i} dir="auto" className={i === li && !done ? "caret text-ink" : ""}>
            <span className="text-nova-soft">&gt;</span>{" "}
            {i === li && !done ? l.slice(0, ch) : l}
          </p>
        ))}
      </div>
    </div>
  );
}
