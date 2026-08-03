"use client";

import { useCallback, type ReactNode } from "react";

/**
 * Wraps a card so a soft nova glow tracks the cursor across it.
 * Writes CSS custom properties directly — no React state, no re-renders.
 */
export default function Spotlight({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

  return (
    <div className={`spot h-full ${className}`} onPointerMove={onMove}>
      {children}
    </div>
  );
}
