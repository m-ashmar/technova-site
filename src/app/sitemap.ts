import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // www, matching the canonical in layout.tsx: the apex 308s here, and a
      // sitemap that lists a redirecting URL is a crawl signal wasted.
      url: "https://www.technovadev.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
