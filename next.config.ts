import type { NextConfig } from "next";

// The dev server serves modules through eval and React's dev build evals to
// rebuild server stacks; production needs neither, so the escape hatch is
// scoped to dev instead of being baked into the shipped policy.
const isDev = process.env.NODE_ENV !== "production";

/**
 * One policy for every response. No nonce on purpose: a nonce has to be minted
 * per request, which forces dynamic rendering and gives up the static/edge
 * cache on what is a fully prerendered marketing site. 'unsafe-inline' would be
 * unavoidable regardless — layout.tsx ships a blocking pre-paint script and
 * Next injects its own bootstrap inline.
 *
 * Cross-Origin-Embedder-Policy is deliberately absent: require-corp would
 * refuse the zygnalsy.com demo frame, which serves no CORP header.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind's runtime layer and Next both inject <style> blocks
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // next/font self-hosts the four families; data: covers inlined faces
  "font-src 'self' data:",
  // ws: keeps the dev server's HMR socket alive; nothing calls out in prod
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  // the RUN LIVE embed in Work — drop this and the flagship demo goes dark
  "frame-src https://zygnalsy.com",
  // three.js/postprocessing compile shaders off-thread from blob URLs
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "browsing-topics=(), camera=(), microphone=(), geolocation=()",
  },
  // belt and braces for frame-ancestors: still honoured by older engines
  { key: "X-Frame-Options", value: "DENY" },
  // Vercel adds this at the edge, but a security header should not depend on
  // a platform default we do not control.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.101'],
  logging: {
    // three.js warns with cyclic objects during WebGL init; Next's dev-mode
    // browser->terminal forwarder JSON.stringifies console args and crashes
    // on them (observed as "cannot serialize cyclic structures" in the hero).
    browserToTerminal: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
