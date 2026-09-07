import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    // www, matching the canonical in layout.tsx and the URL in sitemap.ts.
    sitemap: "https://www.technovadev.com/sitemap.xml",
  };
}
