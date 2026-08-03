import { loadContent } from "@/lib/content/loader";
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

export default function Home() {
  const bundle = loadContent();
  return (
    <AppProvider bundle={bundle}>
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
