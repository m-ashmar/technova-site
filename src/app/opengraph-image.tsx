import { ImageResponse } from "next/og";
import { STAR_GLYPH_PATH, STAR_GLYPH_VIEWBOX } from "@/lib/star";
import { loadContent } from "@/lib/content/loader";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TechNova — Software & AI Studio";

/** The share card: the logo lockup on the brand's own black, star and all. */
export default async function Image() {
  const { site } = loadContent();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 45%, #0d1a33 0%, #050608 55%, #050608 100%)",
          color: "#f2f5fb",
          fontFamily: "sans-serif",
        }}
      >
        {/* TE ★ CH */}
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <span
            style={{
              fontSize: 128,
              letterSpacing: 16,
              fontWeight: 600,
            }}
          >
            TE
          </span>
          <svg
            viewBox={STAR_GLYPH_VIEWBOX}
            width={104}
            height={318}
            style={{ marginTop: -6 }}
          >
            <path d={STAR_GLYPH_PATH} fill="#e8eefc" />
          </svg>
          <span
            style={{
              fontSize: 128,
              letterSpacing: 16,
              fontWeight: 600,
            }}
          >
            CH
          </span>
        </div>

        {/* flare line under the star */}
        <div
          style={{
            width: 760,
            height: 2,
            marginTop: -150,
            background:
              "linear-gradient(90deg, rgba(10,132,255,0) 0%, #0a84ff 50%, rgba(10,132,255,0) 100%)",
          }}
        />

        <div style={{ display: "flex", fontSize: 54, marginTop: 118, letterSpacing: 22 }}>
          <span style={{ fontWeight: 600 }}>TECH</span>
          <span style={{ color: "#0a84ff", fontWeight: 600 }}>NOVA</span>
        </div>

        <div
          style={{
            fontSize: 24,
            letterSpacing: 10,
            marginTop: 26,
            color: "#8a93a6",
          }}
        >
          {site.en.hero.tagline}
        </div>
      </div>
    ),
    size
  );
}
