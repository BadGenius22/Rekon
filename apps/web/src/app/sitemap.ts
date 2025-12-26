import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/metadata";

/**
 * Generate sitemap for SEO
 *
 * Note: Individual market pages (/markets/[slug]) are dynamic and discovered
 * through internal linking. For high-traffic markets, consider adding a
 * dynamic sitemap that fetches active markets from the API.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url;

  // Static routes with their priorities and change frequencies
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/markets`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
  ];

  // Game category routes - these are the main entry points for browsing
  // Individual markets are discovered through these category pages
  const gameRoutes: MetadataRoute.Sitemap = [
    "cs2",
    "lol",
    "dota2",
    "valorant",
    "cod",
    "r6",
    "hok",
  ].map((game) => ({
    url: `${baseUrl}/markets?game=${game}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  // Legal pages
  const legalRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  return [...staticRoutes, ...gameRoutes, ...legalRoutes];
}
