import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { GamesShowcase } from "@/components/games-showcase";
import { StatsSection } from "@/components/stats-section";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { SITE_CONFIG } from "@/lib/metadata";

/**
 * Get API base URL from environment or construct from app URL.
 * Centralized to ensure consistency across the app.
 */
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Fallback: construct from app URL
  return SITE_CONFIG.appUrl.replace("app.rekon.gg", "api.rekon.gg");
}

/**
 * Fetch game icons server-side for SEO and performance.
 *
 * Best Practices (aligned with Next.js 16 and web app patterns):
 * - Server-side rendering ensures icons are in initial HTML (SEO-friendly)
 * - ISR (Incremental Static Regeneration) for optimal performance
 * - Revalidation time balances freshness with performance
 * - Graceful error handling with fallback to colored indicators
 * - Errors handled gracefully - page renders even if API is unavailable
 *
 * @returns Map of gameId -> imageUrl from Polymarket API
 */
async function getGameIcons(): Promise<Record<string, string>> {
  // Fetch game icons - errors are handled gracefully by returning empty object
  // During build, if API is unavailable, page renders with empty state
  // ISR will revalidate at runtime when API is available
  try {
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}/games/icons`;

    const response = await fetch(url, {
      // ISR: Revalidate every hour (icons rarely change)
      // Matches web app pattern: 60s for icons, but landing page can be longer
      // since it's less frequently accessed
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      // Log in development, silent in production
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Games] Failed to fetch icons: ${response.status} ${response.statusText}`
        );
      }
      return {};
    }

    return (await response.json()) as Record<string, string>;
  } catch (error) {
    // Only log warnings in development - during build, API may not be available
    // This is expected and handled gracefully by returning empty data
    if (process.env.NODE_ENV === "development") {
      console.warn("[Games] Failed to fetch icons:", error);
    }
    return {};
  }
}

export default async function LandingPage() {
  // Fetch game icons server-side for SEO
  const gameIcons = await getGameIcons();

  return (
    <main className="min-h-screen bg-[#030711] text-white">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <GamesShowcase gameIcons={gameIcons} />
      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
