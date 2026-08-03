import { NextResponse } from "next/server";
import { loadContent } from "@/lib/content/loader";
import { isLocale } from "@/lib/i18n";

/**
 * The site serves its own content as an API:
 *   GET /api/content/site?locale=en|ar
 *   GET /api/content/projects?locale=en|ar   (omit locale for bilingual rows)
 *   GET /api/content/services?locale=en|ar
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;
  const locale = new URL(req.url).searchParams.get("locale");
  const bundle = loadContent();

  if (collection === "site") {
    return NextResponse.json(
      isLocale(locale) ? bundle.site[locale] : bundle.site
    );
  }

  if (collection === "projects" || collection === "services") {
    const rows = bundle[collection];
    if (isLocale(locale)) {
      return NextResponse.json(
        rows.map(({ locales, ...rest }) => ({ ...rest, ...locales[locale] }))
      );
    }
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: "unknown collection" }, { status: 404 });
}
