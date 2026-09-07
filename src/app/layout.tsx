import type { Metadata, Viewport } from "next";
import {
  Orbitron,
  Inter,
  JetBrains_Mono,
  IBM_Plex_Sans_Arabic,
} from "next/font/google";
import { loadContent } from "@/lib/content/loader";
import "./globals.css";

const display = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// The heaviest family we ship, and only visitors who flip to AR ever paint it.
// Preloading it stole priority from the Orbitron the hero's LCP text needs, so
// it now loads on demand; 300/600 are unused anywhere in the styles.
const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ar",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

// Three hosts serve identical HTML (apex, www, the Vercel domain) and Vercel
// makes www primary — so every absolute URL we emit must resolve to www or we
// split our own ranking signals three ways.
const SITE_URL = "https://www.technovadev.com";

// The <head> reads from the same content engine as the page and the content
// API: content/site.en.json is the only place these strings are written.
const { meta } = loadContent().site.en;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: meta.title,
    template: "%s · TechNova",
  },
  description: meta.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: "/",
    siteName: "TechNova",
    type: "website",
    locale: "en_US",
  },
  // No twitter-image file, so X falls back to the generated opengraph-image.
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#050608",
};

// Runs before paint: applies stored locale so there is no direction/language flash.
const initScript = `(function(){try{var l=localStorage.getItem('locale');if(l!=='en'&&l!=='ar')l='en';var d=document.documentElement;d.setAttribute('lang',l);d.setAttribute('dir',l==='ar'?'rtl':'ltr');if(l==='ar')d.classList.add('lang-ar');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* plain blocking inline script: runs during parse, before paint */}
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        {children}
      </body>
    </html>
  );
}
