import MarqueeBanner from "@/components/MarqueeBanner";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import ApiPreview from "@/components/ApiPreview";
import About from "@/components/About";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      {/* Chrome — sticky at top of the page */}
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <MarqueeBanner />
        <Nav />
      </div>

      {/* Sections — normal document flow, body scroll */}
      <main id="scroll-root">
        <section id="overview"      className="snap-section"><Hero /></section>
        <section id="how-it-works"  className="snap-section"><HowItWorks /></section>
        <section id="features"      className="snap-section"><Features /></section>
        <section id="api"           className="snap-section"><ApiPreview /></section>
        <section id="about"         className="snap-section"><About /></section>
        <footer id="footer-section"><Footer /></footer>
      </main>
    </>
  );
}
