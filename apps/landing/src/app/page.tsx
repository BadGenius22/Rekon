import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { GamesShowcase } from "@/components/games-showcase";
import { StatsSection } from "@/components/stats-section";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <GamesShowcase />
      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
