import type { Market } from "@rekon/types";
import { API_CONFIG } from "@rekon/config";
import { formatPrice, formatVolume, formatPercentage } from "@rekon/utils";

// Use ISR (Incremental Static Regeneration) for better performance
// Revalidates every 10 seconds - good balance between freshness and performance
// For real-time updates, use WebSocket or client-side polling (future enhancement)
export const revalidate = 10; // Revalidate every 10 seconds

async function getMarkets(): Promise<Market[]> {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/markets`, {
      next: { revalidate: 10 }, // ISR: Cache for 10 seconds, then revalidate
    });

    if (!response.ok) {
      console.warn(`Failed to fetch markets: ${response.status}`);
      return [];
    }

    return response.json();
  } catch (error) {
    // Handle connection errors gracefully (e.g., during build or API down)
    console.warn("Failed to fetch markets:", error);
    return [];
  }
}

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neon-cyan mb-2">Markets</h1>
          <p className="text-foreground/60">
            Professional trading terminal for prediction markets
          </p>
        </div>

        {markets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/60">No markets found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketCard({ market }: { market: Market }) {
  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");
  const primaryOutcome = yesOutcome || market.outcomes[0];

  return (
    <div className="border border-border rounded-lg p-6 bg-card hover:border-neon-cyan/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {market.question}
          </h3>
          <div className="flex items-center gap-4 text-sm text-foreground/60">
            <span>Volume: {formatVolume(market.volume)}</span>
            <span>Liquidity: {formatVolume(market.liquidity)}</span>
            {market.isResolved && (
              <span className="text-warning">Resolved</span>
            )}
          </div>
        </div>

        {primaryOutcome && (
          <div className="text-right">
            <div className="text-2xl font-bold text-neon-cyan">
              {formatPrice(primaryOutcome.price)}
            </div>
            <div className="text-sm text-foreground/60">
              {formatPercentage(primaryOutcome.price)}
            </div>
          </div>
        )}
      </div>

      {market.outcomes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex gap-4">
            {market.outcomes.map((outcome) => (
              <div
                key={outcome.id}
                className="flex-1 p-3 rounded bg-muted/50 border border-border"
              >
                <div className="text-sm text-foreground/60 mb-1">
                  {outcome.name}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {formatPrice(outcome.price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
