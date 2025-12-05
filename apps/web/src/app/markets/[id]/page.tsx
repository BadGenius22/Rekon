import { MarketDetailPage } from "@/modules/markets/market-detail-page";
import { notFound } from "next/navigation";

export const revalidate = 10; // Revalidate every 10 seconds

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  // Support both slugs (e.g., "dota2-flc-ty-2025-12-06") and IDs (e.g., "737818")
  // The market detail page will try slug first, then fall back to ID
  return <MarketDetailPage identifier={id} />;
}
