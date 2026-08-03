"use client";

import { useEffect, useState } from "react";
import { NOVA_LIVE_EVENT } from "@/lib/novaState";
import { useApp } from "@/components/providers/AppProvider";

/** Ambient agent status line — appears once the intro completes. */
export default function ConsoleStrip() {
  const { t } = useApp();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const on = () => setLive(true);
    window.addEventListener(NOVA_LIVE_EVENT, on);
    return () => window.removeEventListener(NOVA_LIVE_EVENT, on);
  }, []);

  return (
    <div
      dir="ltr"
      aria-hidden
      className={`fixed bottom-4 left-4 z-40 hidden font-mono text-[11px] text-muted/80 transition-opacity duration-700 md:block ${
        live ? "opacity-100" : "opacity-0"
      }`}
    >
      {t.console.online}
    </div>
  );
}
