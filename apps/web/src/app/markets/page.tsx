import type { Market } from "@rekon/types";
import Link from "next/link";
import { API_CONFIG } from "@rekon/config";
import { formatPrice, formatVolume, formatPercentage } from "@rekon/utils";
import { groupMatchMarkets } from "../../lib/markets";

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

  const dotaMarkets = markets.filter((market) =>
    market.question.toLowerCase().includes("dota 2")
  );
  const groupedMatches = groupMatchMarkets(dotaMarkets);
  const groupedIds = new Set(
    groupedMatches
      .flatMap((g) => [
        g.moneyline?.id,
        ...g.games.map((m) => m.id),
        ...g.others.map((m) => m.id),
      ])
      .filter((id): id is string => Boolean(id))
  );
  const remainingMarkets = markets.filter((m) => !groupedIds.has(m.id));

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neon-cyan mb-2">Markets</h1>
          <p className="text-foreground/60">
            Professional trading terminal for prediction markets
          </p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="text-sm text-foreground/60">
              {includeResolved
                ? "Showing live and resolved esports markets"
                : "Showing only live (unresolved) esports markets"}
            </span>
            <Link
              href={
                includeResolved ? "/markets" : "/markets?includeResolved=true"
              }
              className="text-xs px-3 py-1 rounded border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
            >
              {includeResolved ? "Hide resolved" : "Include resolved"}
            </Link>
          </div>
        </div>

        {markets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/60">No markets found</p>
          </div>
        ) : (
          <>
            {groupedMatches.length > 0 && (
              <section className="mb-10 space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">
                  Dota 2 Matches
                </h2>
                <p className="text-sm text-foreground/60">
                  Polymarket-style layout: match moneyline, then individual game
                  markets.
                </p>
                <div className="space-y-6">
                  {groupedMatches.map((group) => (
                    <div
                      key={group.key}
                      className="rounded-lg border border-border bg-card/60 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <h3 className="text-lg font-semibold text-foreground">
                          {group.title}
                        </h3>
                        {group.moneyline && (
                          <span className="text-xs rounded-full border border-neon-cyan/60 px-2 py-0.5 text-neon-cyan">
                            Moneyline
                          </span>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                        {group.moneyline && (
                          <div>
                            <MarketCard market={group.moneyline} />
                          </div>
                        )}

                        {(group.games.length > 0 ||
                          group.others.length > 0) && (
                          <div className="space-y-3">
                            {group.games.length > 0 && (
                              <div>
                                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/60">
                                  Games
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {group.games.map((market) => (
                                    <MarketCard
                                      key={market.id}
                                      market={market}
                                      compact
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {group.others.length > 0 && (
                              <div>
                                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/60">
                                  Other Markets
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {group.others.map((market) => (
                                    <MarketCard
                                      key={market.id}
                                      market={market}
                                      compact
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                All Markets
              </h2>
              <div className="grid gap-4">
                {remainingMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
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
