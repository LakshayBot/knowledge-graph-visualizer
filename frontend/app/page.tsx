import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import TechStack from "@/components/TechStack";
import UseCases from "@/components/UseCases";
import DemoPreview from "@/components/DemoPreview";
import About from "@/components/About";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="bg-[#e8e8e8]">
      <HeroSection />
      <HowItWorks />
      <Features />
      <TechStack />
      <UseCases />
      <DemoPreview />
      <About />
      <Footer />
    </main>
  );
}
