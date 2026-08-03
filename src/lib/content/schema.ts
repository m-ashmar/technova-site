import { z } from "zod";

/**
 * The content engine's contract. Everything user-visible lives in `content/*.json`
 * and must satisfy these schemas — a bad edit fails at load with the exact path.
 * EN and AR use identical shapes.
 */

const NavLink = z.object({ id: z.string().min(1), label: z.string().min(1) });
const Value = z.object({ title: z.string().min(1), body: z.string().min(1) });
const Option = z.object({ id: z.string().min(1), label: z.string().min(1) });

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
    services: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      lead: z.string().min(1),
    }),
    work: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      lead: z.string().min(1),
      note: z.string().min(1),
      playLabel: z.string().min(1),
      closeLabel: z.string().min(1),
      statusLabels: z.object({
        live: z.string().min(1),
        building: z.string().min(1),
        soon: z.string().min(1),
      }),
    }),
    about: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      values: z.array(Value).min(1),
    }),
    signature: z.object({ line: z.string().min(1) }),
    contact: z.object({
      eyebrow: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      email: z.string().email(),
      emailLabel: z.string().min(1),
      novaNote: z.string().min(1),
    }),
  }),
  nova: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
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
  }),
  footer: z.object({ rights: z.string().min(1), credit: z.string().min(1) }),
});

const ProjectLocale = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  highlight: z.string().optional(),
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
      images: z.array(z.string().min(1)).optional(),
    })
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
  locales: z.object({ en: ServiceLocale, ar: ServiceLocale }),
});

export type SiteContent = z.infer<typeof SiteContentSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Service = z.infer<typeof ServiceSchema>;

export interface ContentBundle {
  site: { en: SiteContent; ar: SiteContent };
  projects: Project[];
  services: Service[];
}
