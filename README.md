# TechNova — technovadev.com

The studio's own site: a particle nova-star that is born on first visit and
travels the whole page, bilingual EN/AR with full RTL, and NOVA — a scripted
intake agent that turns a visitor's idea into a brief.

## Editing content — no code required

Every user-visible string, project and service lives in `content/`:

| File | What it holds |
|---|---|
| `content/site.en.json` / `site.ar.json` | All copy: nav, hero, sections, footer, the whole NOVA script |
| `content/projects.json` | Portfolio entries — order, status, tags, link, embed |
| `content/services.json` | The four capabilities |

Both language files must keep the **same shape**. Edits are validated on load
(`src/lib/content/schema.ts`); a bad edit fails loudly with the exact path
rather than shipping broken. The site also serves its own content back at
`/api/content/{site,projects,services}?locale=en|ar`.

To add a project: append an object to `projects.json` with `en` and `ar`
copy. Nothing else to touch.

## Local development

```bash
npm install
npm run dev
```

Add `?boot=1` to any URL to replay the ignition intro.

## Deploying to Vercel

1. Import `m-ashmar/technova-site` in Vercel. The framework preset is Next.js;
   no build settings need changing.
2. Add the environment variables below (Project → Settings → Environment
   Variables), then redeploy.
3. Add `technovadev.com` under Project → Settings → Domains and point DNS at
   the records Vercel gives you.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | for email delivery | Without it NOVA still works and falls back to a prefilled `mailto:` — briefs are never lost, they just need one extra tap |
| `INTAKE_TO` | optional | Where briefs are sent. Defaults to `nova@technovadev.com` |
| `INTAKE_FROM` | optional | Sender. Defaults to Resend's shared test sender. Once `technovadev.com` is verified in Resend, set this to `NOVA <nova@technovadev.com>` |

**Note:** `INTAKE_TO` must be a mailbox that can *receive* mail. Resend sends;
it does not host an inbox. Cloudflare Email Routing (free) can forward
`nova@technovadev.com` to a personal address.

## Notes

- Fonts are fetched from Google at build time. Vercel builds fine; a local
  build on a poor connection can fail or silently fall back to a system font.
- The 3D scene is decoration, never a dependency: no WebGL, or any GPU/shader
  failure, and the hero draws the logo as static SVG instead.
