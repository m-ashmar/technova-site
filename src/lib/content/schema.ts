import { z } from "zod";

/**
 * The content engine's contract. Everything user-visible lives in `content/*.json`
 * and must satisfy these schemas — a bad edit fails at load with the exact path.
 * EN and AR use identical shapes.
 */

const NavLink = z.object({ id: z.string().min(1), label: z.string().min(1) });
const Fact = z.object({ value: z.string().min(1), label: z.string().min(1) });
const Step = z.object({
  n: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});
const Option = z.object({ id: z.string().min(1), label: z.string().min(1) });
/** A string that exists in both locales. Used by the per-project fields. */
const Bi = z.object({ en: z.string().min(1), ar: z.string().min(1) });
const KV = z.object({ k: z.string().min(1), v: z.string().min(1) });

export const SiteContentSchema = z.object({
  meta: z.object({ title: z.string().min(1), description: z.string().min(1) }),
  nav: z.object({ links: z.array(NavLink).min(1), cta: z.string().min(1) }),
  boot: z.object({ lines: z.array(z.string().min(1)).min(1), skip: z.string().min(1) }),
  hero: z.object({
    eyebrow: z.string().min(1),
    tagline: z.string().min(1),
    statement: z.string().min(1),
    ctaPrimary: z.string().min(1),
    ctaSecondary: z.string().min(1),
    scrollHint: z.string().min(1),
  }),
  console: z.object({
    online: z.string().min(1),
    sections: z.object({
      work: z.string().min(1),
      services: z.string().min(1),
      about: z.string().min(1),
      signature: z.string().min(1),
      contact: z.string().min(1),
    }),
  }),
  sections: z.object({
    // Capabilities: the rows are the title, so there is none.
    services: z.object({ eyebrow: z.string().min(1) }),
    work: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      lead: z.string().min(1),
      playLabel: z.string().min(1),
      closeLabel: z.string().min(1),
      // The per-act outbound link ("Visit ↗"). Ledger labels live per project.
      linkLabel: z.string().min(1),
      statusLabels: z.object({
        live: z.string().min(1),
        building: z.string().min(1),
        soon: z.string().min(1),
      }),
    }),
    // Studio: one statement, four facts on a rule, three process steps.
    about: z.object({
      eyebrow: z.string().min(1),
      statement: z.string().min(1),
      facts: z.array(Fact).length(4),
      processTitle: z.string().min(1),
      process: z.array(Step).length(3),
    }),
    signature: z.object({ line: z.string().min(1) }),
    contact: z.object({
      eyebrow: z.string().min(1),
      // The invitation: "Start a project" in the statement tier.
      statementTitle: z.string().min(1),
      body: z.string().min(1),
      email: z.string().email(),
      // The reply promise, rendered as a label under the email.
      reply: z.string().min(1),
      // Mono header line above NovaChat, e.g. "nova.intake — v1".
      terminalHeader: z.string().min(1),
    }),
  }),
  nova: z.object({
    name: z.string().min(1),
    greeting: z.string().min(1),
    steps: z.object({
      type: z.object({ q: z.string().min(1), options: z.array(Option).min(2) }),
      brief: z.object({
        q: z.string().min(1),
        placeholder: z.string().min(1),
        next: z.string().min(1),
      }),
      budget: z.object({ q: z.string().min(1), options: z.array(Option).min(2) }),
      timeline: z.object({ q: z.string().min(1), options: z.array(Option).min(2) }),
      contact: z.object({
        q: z.string().min(1),
        placeholder: z.string().min(1),
        send: z.string().min(1),
      }),
    }),
    recap: z.object({
      title: z.string().min(1),
      typeLabel: z.string().min(1),
      briefLabel: z.string().min(1),
      budgetLabel: z.string().min(1),
      timelineLabel: z.string().min(1),
      contactLabel: z.string().min(1),
      confirm: z.string().min(1),
      edit: z.string().min(1),
    }),
    sending: z.string().min(1),
    sentTitle: z.string().min(1),
    sentBody: z.string().min(1),
    fallbackNote: z.string().min(1),
    fallbackCta: z.string().min(1),
    errorNote: z.string().min(1),
    restart: z.string().min(1),
    // The live NOVA turn (Claude) inside the brief step; keys are static UI.
    ai: z.object({
      thinking: z.string().min(1),
      answerPlaceholder: z.string().min(1),
      skip: z.string().min(1),
      // Short lines the robot types while it waits for the visitor.
      lines: z.array(z.string().min(1)).min(3).max(8),
      summaryTitle: z.string().min(1),
      summarizing: z.string().min(1),
    }),
  }),
  // One line naming what the company is; no credit slogan.
  footer: z.object({ rights: z.string().min(1), tagline: z.string().min(1) }),
});

const ProjectLocale = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  highlight: z.string().optional(),
});

/** How an act composes with the organism (design-system §5, Work table). */
export const ProjectLayout = z.enum([
  "media-end",
  "media-start",
  "theatre",
  "spec",
  "phones",
]);
/** CSS-only device chrome around a product image; `none` is the bare image. */
export const ImageFrame = z.enum(["browser", "tablet", "phone", "none"]);

const ProjectImage = z.object({
  src: z.string().min(1),
  frame: ImageFrame,
  alt: Bi,
});

export const ProjectSchema = z.object({
  slug: z.string().min(1),
  order: z.number(),
  status: z.enum(["live", "building", "soon"]),
  tags: z.array(z.string().min(1)),
  link: z.string().url().optional(),
  media: z
    .object({
      embed: z.string().url().optional(),
      poster: z.string().min(1).optional(),
      layout: ProjectLayout.optional(),
      images: z.array(ProjectImage).optional(),
    })
    .optional(),
  // 2–3 rows of key / value (role, stack, scope — never dates). The locale
  // is picked at render time; `highlight` renders as the first row.
  ledger: z.array(z.object({ k: Bi, v: Bi })).max(3).optional(),
  // The `spec` layout: a mono spec sheet, rows of label / value.
  spec: z.object({ en: z.array(KV).min(1), ar: z.array(KV).min(1) }).optional(),
  // The `phones` layout: short feature lines beside the three phone frames.
  features: z
    .object({ en: z.array(z.string().min(1)).min(1), ar: z.array(z.string().min(1)).min(1) })
    .optional(),
  locales: z.object({ en: ProjectLocale, ar: ProjectLocale }),
});

const ServiceLocale = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export const ServiceSchema = z.object({
  slug: z.string().min(1),
  order: z.number(),
  icon: z.enum(["ai", "apps", "web", "auto"]),
  // Exactly three concrete deliverables per locale, joined by " · " in the row.
  deliverables: z.object({
    en: z.array(z.string().min(1)).length(3),
    ar: z.array(z.string().min(1)).length(3),
  }),
  locales: z.object({ en: ServiceLocale, ar: ServiceLocale }),
});

export type SiteContent = z.infer<typeof SiteContentSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type ProjectLayoutKind = z.infer<typeof ProjectLayout>;
export type ImageFrameKind = z.infer<typeof ImageFrame>;
export type ProjectImageEntry = z.infer<typeof ProjectImage>;

export interface ContentBundle {
  site: { en: SiteContent; ar: SiteContent };
  projects: Project[];
  services: Service[];
}
