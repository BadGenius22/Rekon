import type { Metadata } from "next";

/**
 * Site configuration for SEO and metadata - Landing Page (rekon.gg)
 */
export const SITE_CONFIG = {
  name: "Rekon",
  title: "Professional Esports Trading Terminal",
  tagline: "Trade Esports Markets Like a Pro",
  description:
    "Professional trading terminal for esports prediction markets. Real-time odds, instant settlements, and pro-grade analytics for CS2, LoL, Dota 2, Valorant, and more.",
  url: "https://rekon.gg",
  appUrl: "https://app.rekon.gg",
  ogImage: "/og-image.png",
  twitterImage: "/twitter-card.png",
  keywords: [
    "esports betting",
    "prediction markets",
    "CS2 betting",
    "League of Legends betting",
    "Dota 2 betting",
    "Valorant betting",
    "esports trading",
    "polymarket esports",
    "esports odds",
    "esports predictions",
    "crypto betting",
    "decentralized betting",
    "esports trading terminal",
    "pro esports betting",
  ],
  social: {
    twitter: "@rekongg",
    discord: "https://discord.gg/rekon",
    github: "https://github.com/BadGenius22/Rekon",
  },
  creator: "Rekon Team",
  games: [
    { name: "CS2", slug: "cs2", color: "#F59E0B" },
    { name: "League of Legends", slug: "lol", color: "#3B82F6" },
    { name: "Dota 2", slug: "dota2", color: "#EF4444" },
    { name: "Valorant", slug: "valorant", color: "#EC4899" },
    { name: "Call of Duty", slug: "cod", color: "#22C55E" },
    { name: "Rainbow Six", slug: "r6", color: "#8B5CF6" },
    { name: "Honor of Kings", slug: "hok", color: "#F97316" },
  ],
} as const;

/**
 * Default metadata for the landing page
 */
export const DEFAULT_METADATA: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name} - ${SITE_CONFIG.title}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: [...SITE_CONFIG.keywords],
  authors: [{ name: SITE_CONFIG.creator }],
  creator: SITE_CONFIG.creator,
  publisher: SITE_CONFIG.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.title}`,
    description: SITE_CONFIG.description,
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.name} - ${SITE_CONFIG.title}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE_CONFIG.social.twitter,
    creator: SITE_CONFIG.social.twitter,
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.title}`,
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.twitterImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo-white.svg", type: "image/svg+xml" },
      { url: "/logo-white.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [
      { url: "/logo-white.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/logo-white.svg", type: "image/svg+xml" }],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_CONFIG.url,
  },
};

/**
 * Generate Organization schema for JSON-LD
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo.svg`,
    description: SITE_CONFIG.description,
    sameAs: [
      `https://x.com/${SITE_CONFIG.social.twitter.replace("@", "")}`,
      SITE_CONFIG.social.discord,
      SITE_CONFIG.social.github,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: SITE_CONFIG.social.discord,
    },
  };
}

/**
 * Generate WebSite schema for JSON-LD
 */
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_CONFIG.url,
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_CONFIG.appUrl}/markets?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate SoftwareApplication schema for JSON-LD
 */
export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: SITE_CONFIG.description,
    featureList: [
      "Real-time esports odds",
      "Instant settlements",
      "Professional analytics",
      "Portfolio tracking",
      "Multi-game support (CS2, LoL, Dota 2, Valorant, CoD, R6, HoK)",
      "Powered by Polymarket",
    ],
    screenshot: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`,
    softwareVersion: "1.0.0",
  };
}

/**
 * Generate all JSON-LD schemas combined
 */
export function generateAllSchemas() {
  return [
    generateOrganizationSchema(),
    generateWebSiteSchema(),
    generateSoftwareApplicationSchema(),
  ];
}
