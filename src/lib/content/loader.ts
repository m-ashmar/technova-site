import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  ProjectSchema,
  ServiceSchema,
  SiteContentSchema,
  type ContentBundle,
} from "./schema";

/**
 * Server-side content source. Reads and validates `content/*.json`.
 * In dev it re-reads on every call so JSON edits appear on refresh;
 * in production it parses once per server instance.
 *
 * This is the single seam for going dynamic later: replace the fs reads
 * with fetches to any CMS/API and nothing else in the app changes.
 */

function readJson(name: string): unknown {
  const file = path.join(process.cwd(), "content", name);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let cache: ContentBundle | null = null;

export function loadContent(): ContentBundle {
  if (cache && process.env.NODE_ENV === "production") return cache;
  try {
    const bundle: ContentBundle = {
      site: {
        en: SiteContentSchema.parse(readJson("site.en.json")),
        ar: SiteContentSchema.parse(readJson("site.ar.json")),
      },
      projects: z
        .array(ProjectSchema)
        .parse(readJson("projects.json"))
        .slice()
        .sort((a, b) => a.order - b.order),
      services: z
        .array(ServiceSchema)
        .parse(readJson("services.json"))
        .slice()
        .sort((a, b) => a.order - b.order),
    };
    cache = bundle;
    return bundle;
  } catch (err) {
    if (err instanceof z.ZodError) {
      const details = err.issues
        .map((i) => `  · ${i.path.join(".") || "(root)"} — ${i.message}`)
        .join("\n");
      throw new Error(`Content validation failed:\n${details}`);
    }
    throw err;
  }
}
