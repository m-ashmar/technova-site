import { loadContent } from "@/lib/content/loader";
import AppProvider from "@/components/providers/AppProvider";
import Nav from "@/components/site/Nav";
import ConsoleStrip from "@/components/site/ConsoleStrip";
import Footer from "@/components/site/Footer";
import IgnitionHero from "@/components/hero/IgnitionHero";
import Services from "@/components/sections/Services";
import Work from "@/components/sections/Work";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";

export default function Home() {
  const bundle = loadContent();
  return (
    <AppProvider bundle={bundle}>
      <Nav />
      <main>
        <IgnitionHero />
        <Work />
        <Services />
        <About />
        <Contact />
      </main>
      <ConsoleStrip />
      <Footer />
    </AppProvider>
  );
}
