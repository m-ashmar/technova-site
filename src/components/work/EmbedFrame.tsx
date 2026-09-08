"use client";

import Image from "next/image";
import type { Ref } from "react";

/**
 * The RUN LIVE stage: the closed state is a rule with the host and a play
 * control (or the poster, when content ships one); the open state is the
 * sandboxed frame. The iframe attributes are load-bearing — see the comment
 * above it — and must not be loosened.
 */
export function EmbedFrame({
  url,
  title,
  closeLabel,
  onClose,
}: {
  url: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line-strong bg-surface">
      <div
        dir="ltr"
        className="flex h-7 items-center justify-between border-b border-line px-3"
      >
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-nova/60" />
        </span>
        <span className="t-label text-muted">{new URL(url).host}</span>
        <button
          type="button"
          onClick={onClose}
          className="t-label text-muted transition hover:text-ink"
        >
          <span aria-hidden>✕ </span>
          {closeLabel}
        </button>
      </div>
      {/*
        An unsandboxed cross-origin frame can navigate its host away, so the
        embed gets the minimum it needs to boot: scripts, its OWN origin, and
        target=_blank links. allow-top-navigation is withheld on purpose, and
        allow="" hands it none of the powerful features (camera, geolocation…).
        The frame is named for the project — the chrome above already shows the
        host, and a raw URL makes a poor accessible name.
      */}
      <iframe
        src={url}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer"
        allow=""
        className="aspect-[16/10] w-full bg-black"
      />
    </div>
  );
}

/** The pre-play surface. With a poster it is the poster; without, a rule. */
export function EmbedIdle({
  url,
  title,
  playLabel,
  poster,
  onPlay,
  buttonRef,
}: {
  url: string;
  title: string;
  playLabel: string;
  poster?: string;
  onPlay: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const host = new URL(url).host;

  if (poster) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={onPlay}
        className="group relative block w-full text-start"
      >
        <span className="frame-browser block">
          <Image
            src={poster}
            alt={title}
            width={1600}
            height={1000}
            sizes="(min-width: 48rem) min(92vw, 1312px), 100vw"
            loading="lazy"
          />
        </span>
        <span className="absolute inset-0 flex items-end justify-between p-4">
          <span className="t-label text-muted" dir="ltr">
            {host}
          </span>
          <span className="t-label rounded-full border border-line-strong bg-bg/70 px-4 py-2 text-nova-soft transition group-hover:border-nova/60 group-focus-visible:border-nova/60">
            <span aria-hidden>▶ </span>
            {playLabel}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="rule-strong flex items-center justify-between gap-4 py-4">
      <span className="t-label text-muted" dir="ltr">
        {host}
      </span>
      <button
        ref={buttonRef}
        type="button"
        onClick={onPlay}
        className="t-label rounded-full border border-line-strong px-4 py-2 text-nova-soft transition hover:border-nova/60"
      >
        <span aria-hidden>▶ </span>
        {playLabel}
      </button>
    </div>
  );
}
