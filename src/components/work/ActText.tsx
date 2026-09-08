"use client";

import { useApp, type LocalizedProject } from "@/components/providers/AppProvider";
import { actNumeral } from "./digits";

/**
 * The text column of an act, top to bottom exactly as design-system §5 lists
 * it: numeral, status · tags, title, summary, ledger (highlight first), link.
 */
export default function ActText({
  project: p,
  titleId,
}: {
  project: LocalizedProject;
  titleId: string;
}) {
  const { t, locale, dir } = useApp();
  const w = t.sections.work;
  const arrow = dir === "rtl" ? "↖" : "↗";
  const ledger = p.ledger ?? [];

  return (
    <div>
      <p className="t-numeral select-none" aria-hidden>
        {actNumeral(p.order, locale)}
      </p>

      <p className="t-label mt-2 text-muted">
        <span className={p.status === "live" ? "text-nova-soft" : undefined}>
          {w.statusLabels[p.status]}
        </span>
        {p.tags.map((tag) => (
          <span key={tag}>
            <span aria-hidden> · </span>
            <span dir="ltr">{tag}</span>
          </span>
        ))}
      </p>

      <h3 id={titleId} className="t-title mt-5 text-ink">
        {p.title}
      </h3>

      <p className="t-body mt-5 text-ink-soft">{p.summary}</p>

      {p.highlight || ledger.length > 0 ? (
        <ul className="mt-8 list-none p-0">
          {p.highlight ? (
            <li className="rule-strong py-3">
              <span className="t-small block text-ink">{p.highlight}</span>
            </li>
          ) : null}
          {ledger.map((row, i) => (
            <li
              key={row.k.en}
              className={`grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-3 ${
                i === 0 && !p.highlight ? "rule-strong" : "rule"
              }`}
            >
              <span className="t-label pt-1 text-muted">{row.k[locale]}</span>
              <span className="t-small text-ink-soft">{row.v[locale]}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {p.link ? (
        <p className="mt-8">
          <a
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            className="t-label inline-flex items-center gap-2 text-ink transition hover:text-nova-soft"
          >
            {w.linkLabel}
            <span className="sr-only"> — {p.title}</span>
            <span aria-hidden>{arrow}</span>
          </a>
        </p>
      ) : null}
    </div>
  );
}
