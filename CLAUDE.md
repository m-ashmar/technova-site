# TechNova site — working rules

- This Next.js 16 differs from training data. **Read the relevant guide in
  `node_modules/next/dist/docs/` before using unfamiliar Next APIs.** Turbopack is the
  default bundler for dev AND build; `proxy.ts` replaces `middleware.ts`.
- **Content is data, not code.** All user-visible copy, projects, and services live in
  `content/*.json` (EN/AR, identical shapes, validated by `src/lib/content/schema.ts`).
  Components only render what the loader gives them — never hardcode a user-visible
  sentence in a component. The site serves its own content back at `/api/content/*`.
- Shaders are inline template strings (Turbopack must never need loader config).
- Dark theme only. Brand: nova blue `#0A84FF` on `#050608`; Orbitron for display type
  (Arabic display falls back to IBM Plex Sans Arabic); JetBrains Mono for console text.
- Bilingual EN/AR with correct RTL is mandatory in every feature, not a follow-up.
- The sibling repo `~/Desktop/Protofollio` is the delivered **Zygnal** client site
  (zygnalsy.com). Never edit it, except the one planned footer-link swap after launch.
- The in-app browser can screenshot black on pages with an active WebGL context —
  verify 3D via `gl.readPixels` brightness sampling and DOM via text tools.
