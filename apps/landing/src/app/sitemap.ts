import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/metadata";

/**
 * Generate sitemap for landing page SEO
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url;

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
