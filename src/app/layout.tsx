import type { Metadata, Viewport } from "next";
import {
  Orbitron,
  Inter,
  JetBrains_Mono,
  IBM_Plex_Sans_Arabic,
} from "next/font/google";
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

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ar",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://technovasy.com"),
  title: {
    default: "TechNova — Software & AI Studio",
    template: "%s · TechNova",
  },
  description:
    "Syrian software & AI studio building intelligent apps, web experiences and AI solutions — Solutions That Inspire.",
  keywords: [
    "TechNova",
    "software studio",
    "AI solutions",
    "web development",
    "app development",
    "Damascus",
    "Syria",
  ],
  openGraph: {
    title: "TechNova — Software & AI Studio",
    description:
      "Intelligent apps, web experiences and AI solutions. This site is our first demo: it is born in front of you.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#050608",
};

// Runs before paint: applies stored locale so there is no direction/language flash.
// The `rafshim` clause is a verification aid: with ?rafshim=1, animation frames are
// driven by timers so the experience also runs in hidden/throttled tabs (used by
// automated checks in dev; inert unless explicitly requested).
const initScript = `(function(){try{var l=localStorage.getItem('locale');if(l!=='en'&&l!=='ar')l='en';var d=document.documentElement;d.setAttribute('lang',l);d.setAttribute('dir',l==='ar'?'rtl':'ltr');if(l==='ar')d.classList.add('lang-ar');}catch(e){}try{if(location.search.indexOf('rafshim')>-1){window.requestAnimationFrame=function(cb){return window.setTimeout(function(){cb(performance.now())},33)};window.cancelAnimationFrame=function(id){window.clearTimeout(id)};}}catch(e){}})();`;

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
