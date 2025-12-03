import type { Market } from "@rekon/types";
import Link from "next/link";
import { API_CONFIG } from "@rekon/config";
import { formatPrice, formatVolume, formatPercentage } from "@rekon/utils";

// Use ISR (Incremental Static Regeneration) for better performance
// Revalidates every 10 seconds - good balance between freshness and performance
// For real-time updates, use WebSocket or client-side polling (future enhancement)
export const revalidate = 10; // Revalidate every 10 seconds

async function getMarkets(
  includeResolved: boolean,
  game?: string
): Promise<Market[]> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/markets`);
    if (includeResolved) {
      url.searchParams.set("includeResolved", "true");
    }
    if (game) {
      url.searchParams.set("game", game);
    }
    // Align with home hero: only show esports game markets (matches/maps),
    // not long-dated outrights.
    url.searchParams.set("type", "game");

    const response = await fetch(url.toString(), {
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

export default async function MarketsPage(props: {
  searchParams: Promise<{ includeResolved?: string; game?: string }>;
}) {
  const searchParams = await props.searchParams;
  const includeResolved = searchParams.includeResolved === "true";
  const game = searchParams.game;
  const markets = await getMarkets(includeResolved, game);
  const categorized = categorizeByGame(markets);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neon-cyan mb-2">Markets</h1>
          <p className="text-foreground/60">
            Professional trading terminal for prediction markets
          </p>
          <div className="mt-4 text-sm text-foreground/60">
            Showing live esports game markets (matches/maps) across CS2, LoL,
            Dota 2, and Valorant.
          </div>
        </div>

        {markets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/60">No markets found</p>
          </div>
        ) : (
          <>
            {categorized.cs2.length > 0 && (
              <section className="space-y-4 mb-10">
                <h2 className="text-2xl font-semibold text-foreground">
                  CS2 Markets
                </h2>
                <div className="grid gap-4">
                  {categorized.cs2.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {categorized.lol.length > 0 && (
              <section className="space-y-4 mb-10">
                <h2 className="text-2xl font-semibold text-foreground">
                  League of Legends Markets
                </h2>
                <div className="grid gap-4">
                  {categorized.lol.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {categorized.dota2.length > 0 && (
              <section className="space-y-4 mb-10">
                <h2 className="text-2xl font-semibold text-foreground">
                  Dota 2 Markets
                </h2>
                <div className="grid gap-4">
                  {categorized.dota2.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {categorized.valorant.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">
                  Valorant Markets
                </h2>
                <div className="grid gap-4">
                  {categorized.valorant.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function categorizeByGame(markets: Market[]): {
  cs2: Market[];
  lol: Market[];
  dota2: Market[];
  valorant: Market[];
} {
  const result = {
    cs2: [] as Market[],
    lol: [] as Market[],
    dota2: [] as Market[],
    valorant: [] as Market[],
  };

  for (const market of markets) {
    const slug = getGameSlug(market);
    if (slug && slug in result) {
      result[slug].push(market);
    }
  }

  return result;
}

function getGameSlug(
  market: Market
): "cs2" | "lol" | "dota2" | "valorant" | null {
  const text = `${market.category ?? ""} ${market.subcategory ?? ""} ${
    market.question
  }`.toLowerCase();

  if (
    text.includes("dota 2") ||
    text.includes("dota2") ||
    text.includes("dota")
  ) {
    return "dota2";
  }

  if (
    text.includes("valorant") ||
    text.includes("vct") ||
    text.includes("champions") ||
    text.includes("masters")
  ) {
    return "valorant";
  }

  if (
    text.includes("cs2") ||
    text.includes("counter-strike") ||
    text.includes("counter strike")
  ) {
    return "cs2";
  }

  if (
    text.includes("league of legends") ||
    text.includes(" lol ") ||
    text.startsWith("lol:") ||
    text.includes(" lck ") ||
    text.includes(" lpl ") ||
    text.includes(" lec ")
  ) {
    return "lol";
  }

  return null;
}

function MarketCard({
  market,
  compact,
}: {
  market: Market;
  compact?: boolean;
}) {
  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");
  const primaryOutcome = yesOutcome || market.outcomes[0];

  return (
    <div
      className={`border border-border rounded-lg bg-card hover:border-neon-cyan/50 transition-colors ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3
            className={`font-semibold text-foreground mb-2 ${
              compact ? "text-base" : "text-xl"
            }`}
          >
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
