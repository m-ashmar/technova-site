"use client";

import { useRef, type ReactNode } from "react";
import {
  useApp,
  type LocalizedProject,
} from "@/components/providers/AppProvider";
import type { ProjectLayoutKind } from "@/lib/content/schema";
import Reveal from "@/components/ui/Reveal";
import ActText from "./ActText";
import FramedImage from "./FramedImage";
import { EmbedFrame, EmbedIdle } from "./EmbedFrame";
import { actNumeral } from "./digits";

/** Column placement per layout (design-system §5, Work table). */
const COLS: Record<ProjectLayoutKind, { text: string; media: string }> = {
  "media-end": {
    text: "md:col-start-1 md:col-span-5",
    media: "md:col-start-6 md:col-span-7",
  },
  "media-start": {
    text: "md:col-start-8 md:col-span-5",
    media: "md:col-start-1 md:col-span-7",
  },
  theatre: { text: "md:col-span-7", media: "md:col-span-12" },
  spec: {
    text: "md:col-start-1 md:col-span-5",
    media: "md:col-start-7 md:col-span-6",
  },
  phones: {
    text: "md:col-start-1 md:col-span-5",
    media: "md:col-start-7 md:col-span-6",
  },
};

/** `sizes` for images by the column they occupy (of a 1440px wrap). */
const SIZES = {
  wide: "(min-width: 48rem) min(54vw, 780px), 100vw",
  half: "(min-width: 48rem) min(27vw, 380px), (min-width: 40rem) 50vw, 100vw",
  phone: "(min-width: 48rem) min(15vw, 210px), 30vw",
};

/** The three phone frames step down by 2rem, 1.5rem, 0. */
const PHONE_STAGGER = ["md:pt-8", "md:pt-6", ""];

export default function Act({
  project: p,
  open,
  onToggle,
}: {
  project: LocalizedProject;
  /** Whether this act's RUN LIVE embed is showing (theatre only). */
  open: boolean;
  onToggle: (slug: string | null) => void;
}) {
  const { t, locale } = useApp();
  const w = t.sections.work;
  const layout: ProjectLayoutKind = p.media?.layout ?? "media-end";
  const images = p.media?.images ?? [];
  const cols = COLS[layout];
  const titleId = `act-${p.order}-title`;
  const playRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    onToggle(null);
    // the play control remounts; hand focus back so keyboard users stay put
    requestAnimationFrame(() => playRef.current?.focus());
  };

  let media: ReactNode = null;

  if (layout === "theatre") {
    media = p.media?.embed ? (
      open ? (
        <EmbedFrame
          url={p.media.embed}
          title={p.title}
          closeLabel={w.closeLabel}
          onClose={close}
        />
      ) : (
        <EmbedIdle
          url={p.media.embed}
          title={p.title}
          playLabel={w.playLabel}
          poster={p.media.poster}
          onPlay={() => onToggle(p.slug)}
          buttonRef={playRef}
        />
      )
    ) : null;
  } else if (layout === "spec") {
    const rows = p.spec?.[locale] ?? [];
    media = rows.length ? (
      <dl className="m-0">
        {rows.map((row, i) => (
          <div
            key={row.k}
            className={`grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 py-4 ${
              i === 0 ? "rule-strong" : "rule"
            }`}
          >
            <dt className="t-label pt-1 text-muted">{row.k}</dt>
            <dd className="t-small m-0 text-ink">{row.v}</dd>
          </div>
        ))}
      </dl>
    ) : null;
  } else if (layout === "phones") {
    const shots = images.slice(0, 3);
    const features = p.features?.[locale] ?? [];
    media = (
      <div>
        {shots.length ? (
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {shots.map((img, i) => (
              <FramedImage
                key={img.src}
                src={img.src}
                alt={img.alt[locale]}
                frame="phone"
                sizes={SIZES.phone}
                className={PHONE_STAGGER[i]}
              />
            ))}
          </div>
        ) : null}
        {features.length ? (
          <ol className={`m-0 list-none p-0 ${shots.length ? "mt-10" : ""}`}>
            {features.map((line, i) => (
              <li
                key={line}
                className={`grid grid-cols-[3rem_minmax(0,1fr)] gap-4 py-4 ${
                  i === 0 ? "rule-strong" : "rule"
                }`}
              >
                <span className="t-label pt-1 text-muted" aria-hidden>
                  {actNumeral(i + 1, locale)}
                </span>
                <span className="t-small text-ink">{line}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  } else if (images.length) {
    // media-end / media-start: the frames stack; no images, no column.
    // The first shot leads at full width; any further shots pair up under
    // it so a three-image act stays near one viewport tall.
    const [lead, ...rest] = images;
    media = (
      <div className="grid gap-6">
        <FramedImage
          key={lead.src}
          src={lead.src}
          alt={lead.alt[locale]}
          frame={lead.frame}
          sizes={SIZES.wide}
        />
        {rest.length ? (
          <div
            className={`grid gap-6 ${rest.length > 1 ? "sm:grid-cols-2" : ""}`}
          >
            {rest.map((img) => (
              <FramedImage
                key={img.src}
                src={img.src}
                alt={img.alt[locale]}
                frame={img.frame}
                sizes={rest.length > 1 ? SIZES.half : SIZES.wide}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <article
      id={`act-${p.order}`}
      data-act={p.order}
      aria-labelledby={titleId}
      className="py-20 md:flex md:min-h-[100svh] md:items-center md:py-24"
    >
      <div className="wrap grid-12 w-full">
        <Reveal className={`col-span-12 ${cols.text} md:row-start-1`}>
          <ActText project={p} titleId={titleId} />
        </Reveal>
        {media ? (
          <Reveal
            delay={120}
            className={`col-span-12 mt-12 md:mt-0 ${cols.media} ${
              layout === "theatre"
                ? "md:row-start-2 md:pt-12"
                : layout === "spec" || layout === "phones"
                  ? "md:row-start-1 md:self-end" // text-only media sits low; the organism rides above it
                  : "md:row-start-1 md:self-center"
            }`}
          >
            {media}
          </Reveal>
        ) : null}
      </div>
    </article>
  );
}
