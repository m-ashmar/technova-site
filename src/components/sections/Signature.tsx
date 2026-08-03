"use client";

import { useApp } from "@/components/providers/AppProvider";
import Reveal from "@/components/ui/Reveal";

/**
 * A quiet, tall stage: the particles reform into the wordmark
 * (TECHNOVA — or تكنوفا in Arabic) in the open space above the caption.
 */
export default function Signature() {
  const { t } = useApp();
  return (
    <section
      id="signature"
      className="relative flex h-[72vh] min-h-[420px] items-end justify-center pb-16"
    >
      <Reveal>
        <p className="ar-tight text-center font-mono text-xs tracking-[0.3em] text-muted/80">
          {t.sections.signature.line}
        </p>
      </Reveal>
    </section>
  );
}
