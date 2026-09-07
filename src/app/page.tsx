import { loadContent } from "@/lib/content/loader";
import type { ContentBundle } from "@/lib/content/schema";
import AppProvider from "@/components/providers/AppProvider";
import NovaStage from "@/components/hero/NovaStage";
import ScrollDirector from "@/components/site/ScrollDirector";
import Nav from "@/components/site/Nav";
import ScrollProgress from "@/components/site/ScrollProgress";
import ConsoleStrip from "@/components/site/ConsoleStrip";
import Footer from "@/components/site/Footer";
import IgnitionHero from "@/components/hero/IgnitionHero";
import Services from "@/components/sections/Services";
import Work from "@/components/sections/Work";
import About from "@/components/sections/About";
import Signature from "@/components/sections/Signature";
import Contact from "@/components/sections/Contact";

// Same canonical host as the metadata in layout.tsx. The @ids below are
// permanent identifiers for this company, so they must never name a host that
// redirects — a moved @id reads as a different entity.
const SITE_URL = "https://www.technovadev.com";

/**
 * Machine-readable identity. At least five other companies trade as
 * "Technova", so search engines and answer engines need more than the name to
 * tell this studio apart: place, language, founding year, and what it sells.
 * Every claim is read from `content/` — nothing here is asserted that the page
 * does not already say out loud, and unverifiable fields (founder, phone,
 * social profiles, ratings) are left out rather than guessed.
 */
function buildJsonLd({ site, services }: ContentBundle) {
  const en = site.en;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}/#organization`,
        name: "TechNova",
        alternateName: ["تكنوفا"],
        url: SITE_URL,
        description: en.meta.description,
        slogan: en.hero.tagline,
        foundingDate: "2026",
        email: en.sections.contact.email,
        knowsLanguage: ["en", "ar"],
        areaServed: { "@type": "Country", name: "Syria" },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Damascus",
          addressCountry: "SY",
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Services",
          // Straight from content/services.json: the catalog cannot drift from
          // the Services section, because it is the same list.
          itemListElement: services.map((svc) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: svc.locales.en.title,
              description: svc.locales.en.body,
            },
          })),
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "TechNova",
        inLanguage: ["en", "ar"],
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

export default function Home() {
  const bundle = loadContent();
  return (
    <AppProvider bundle={bundle}>
      {/* identity for crawlers: plain HTML, so it lands even if the canvas never boots.
          `<` is escaped because JSON.stringify does not sanitize for HTML. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(bundle)).replace(/</g, "\\u003c"),
        }}
      />
      {/* the organism: one fixed canvas behind everything, morphing with scroll */}
      <NovaStage />
      <ScrollDirector />
      <ScrollProgress />
      <Nav />
      <main className="relative z-10">
        <IgnitionHero />
        <Work />
        <Services />
        <About />
        <Signature />
        <Contact />
      </main>
      <ConsoleStrip />
      <Footer />
    </AppProvider>
  );
}
