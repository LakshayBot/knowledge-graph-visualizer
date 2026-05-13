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
    // Chrome sits OUTSIDE the scroll container so it never
    // contributes to scroll height. Sections use calc(100dvh - var(--chrome-h))
    // so each one fills exactly the remaining viewport.
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      {/* Sticky chrome — pinned above scroll root */}
      <div style={{ flexShrink: 0, zIndex: 100, position: "relative" }}>
        <MarqueeBanner />
        <Nav />
      </div>

      {/* Scroll root — fills remaining height */}
      <div id="scroll-root" style={{ flex: 1, minHeight: 0 }}>
        <section className="snap-section" id="overview">
          <Hero />
        </section>

        <section className="snap-section" id="how-it-works">
          <HowItWorks />
        </section>

        <section className="snap-section" id="features">
          <Features />
        </section>

        <section className="snap-section" id="api">
          <ApiPreview />
        </section>

        <section className="snap-section" id="about">
          <About />
        </section>

        <section className="snap-section" id="footer-section">
          <Footer />
        </section>
      </div>
    </div>
  );
}
