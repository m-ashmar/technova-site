# TechNova — technovasy.com

TechNova's own site. Concept: **Ignition** — the company logo (a four-pointed nova star)
is born live from particles on first visit, then stays alive as the site's presence.
The site is the product demo: intelligent, bilingual (EN/AR + RTL), fast.

## Develop

```bash
npm install
npm run dev
```

## Edit content without touching code

Everything changeable lives in `content/`:

- `content/site.en.json` / `content/site.ar.json` — all site copy (keep the same shape).
- `content/projects.json` — the Work section: add/edit/reorder projects.
- `content/services.json` — the Services section.

Edit the JSON, save (dev) or commit + deploy (prod). Schemas in
`src/lib/content/schema.ts` validate everything at load — a bad edit fails loudly with
the exact path. The same data is exposed at:

- `GET /api/content/site?locale=en|ar`
- `GET /api/content/projects?locale=en|ar` (omit `locale` for the full bilingual rows)
- `GET /api/content/services?locale=en|ar`

## Useful flags

- `?boot=1` — replay the ignition intro (it normally plays once per browser).
