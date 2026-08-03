export default function SectionHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mb-12">
      <p className="ar-tight font-mono text-xs tracking-[0.35em] text-nova-soft/90">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-medium tracking-wide text-ink md:text-4xl">
        {title}
      </h2>
      {lead ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted md:text-base">
          {lead}
        </p>
      ) : null}
    </div>
  );
}
