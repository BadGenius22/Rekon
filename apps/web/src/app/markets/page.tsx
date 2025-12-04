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

  // Debug: Log CS2 markets specifically
  if (process.env.NODE_ENV === "development") {
    const cs2Markets = markets.filter((m) => m.game === "cs2");
    console.log(
      `CS2 markets received: ${cs2Markets.length}`,
      cs2Markets.slice(0, 3).map((m) => ({
        id: m.id,
        question: m.question.substring(0, 60),
        game: m.game,
        slug: m.slug,
      }))
    );
  }
  // Use game field from API instead of frontend categorization
  const categorized = categorizeByGame(markets);

  // Calculate uncategorized count for debug
  const uncategorizedMarkets = markets.filter(
    (m) =>
      !categorized.cs2.includes(m) &&
      !categorized.lol.includes(m) &&
      !categorized.dota2.includes(m) &&
      !categorized.valorant.includes(m)
  );

  // Debug: Log categorization results (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log("Markets categorization:", {
      total: markets.length,
      cs2: categorized.cs2.length,
      lol: categorized.lol.length,
      dota2: categorized.dota2.length,
      valorant: categorized.valorant.length,
      uncategorized: uncategorizedMarkets.length,
    });
    // Log first few markets to see their structure
    if (markets.length > 0) {
      console.log(
        "Sample markets:",
        markets.slice(0, 5).map((m) => ({
          id: m.id,
          question: m.question.substring(0, 80),
          category: m.category,
          subcategory: m.subcategory,
          detected: getGameSlug(m),
        }))
      );
    }
    // Check for CS2-like markets that aren't being detected
    const potentialCS2 = markets.filter((m) => {
      const text = `${m.category ?? ""} ${m.subcategory ?? ""} ${
        m.question
      }`.toLowerCase();
      return (
        text.includes("cs") ||
        text.includes("counter") ||
        text.includes("mouz") ||
        text.includes("iem") ||
        text.includes("blast")
      );
    });
    if (potentialCS2.length > 0) {
      console.log(
        "Potential CS2 markets not detected:",
        potentialCS2.slice(0, 5).map((m) => ({
          question: m.question.substring(0, 80),
          category: m.category,
          subcategory: m.subcategory,
          detected: getGameSlug(m),
        }))
      );
    }
    // Log uncategorized markets to see why they're not matching
    if (uncategorizedMarkets.length > 0) {
      console.log(
        "Uncategorized markets:",
        uncategorizedMarkets.slice(0, 5).map((m) => ({
          question: m.question.substring(0, 80),
          category: m.category,
          subcategory: m.subcategory,
        }))
      );
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-neon-cyan">Markets</h1>
            {markets.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 px-3 py-1 text-sm font-semibold text-neon-cyan">
                <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse" />
                {markets.length} live
              </span>
            )}
          </div>
          <p className="text-foreground/60">
            Professional trading terminal for prediction markets
          </p>
          <div className="mt-4 text-sm text-foreground/60">
            Showing live esports game markets (matches/maps) across CS2, LoL,
            Dota 2, and Valorant.
          </div>
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-xs text-yellow-200">
              <div className="font-semibold mb-2">Debug Info:</div>
              <div>Total markets: {markets.length}</div>
              <div>
                CS2: {categorized.cs2.length} | LoL: {categorized.lol.length} |
                Dota2: {categorized.dota2.length} | Valorant:{" "}
                {categorized.valorant.length}
              </div>
              <div>Uncategorized: {uncategorizedMarkets.length}</div>
              {uncategorizedMarkets.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">
                    Uncategorized markets (first 3)
                  </summary>
                  <pre className="mt-2 overflow-auto text-[10px]">
                    {JSON.stringify(
                      uncategorizedMarkets.slice(0, 3).map((m) => ({
                        question: m.question.substring(0, 100),
                        category: m.category,
                        subcategory: m.subcategory,
                      })),
                      null,
                      2
                    )}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {markets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/60">No markets found</p>
          </div>
        ) : (
          <>
            {categorized.cs2.length > 0 && (
              <section className="space-y-4 mb-10">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">
                    CS2 Markets
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 border border-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground/70">
                    {categorized.cs2.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {categorized.cs2.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {categorized.lol.length > 0 && (
              <section className="space-y-4 mb-10">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">
                    League of Legends Markets
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 border border-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground/70">
                    {categorized.lol.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {categorized.lol.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {categorized.dota2.length > 0 && (
              <section className="space-y-4 mb-10">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Dota 2 Markets
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 border border-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground/70">
                    {categorized.dota2.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {categorized.dota2.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {categorized.valorant.length > 0 && (
              <section className="space-y-4 mb-10">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Valorant Markets
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 border border-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground/70">
                    {categorized.valorant.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {categorized.valorant.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
                </div>
              </section>
            )}

            {/* Show uncategorized markets if any */}
            {(() => {
              const uncategorized = markets.filter(
                (m) =>
                  !categorized.cs2.includes(m) &&
                  !categorized.lol.includes(m) &&
                  !categorized.dota2.includes(m) &&
                  !categorized.valorant.includes(m)
              );
              return uncategorized.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-foreground">
                      Other Markets
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 border border-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground/70">
                      {uncategorized.length}
                    </span>
                  </div>
                  <div className="grid gap-4">
                    {uncategorized.map((market) => (
                      <MarketCard key={market.id} market={market} />
                    ))}
                  </div>
                </section>
              ) : null;
            })()}
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

  // Use game field from API (set by backend enrichment)
  for (const market of markets) {
    if (market.game && market.game in result) {
      result[market.game].push(market);
    }
  }

  return result;
}

function getGameSlug(
  market: Market
): "cs2" | "lol" | "dota2" | "valorant" | null {
  // Prioritize category/subcategory fields (from Polymarket's categorization)
  const category = (market.category ?? "").toLowerCase();
  const subcategory = (market.subcategory ?? "").toLowerCase();
  const question = (market.question ?? "").toLowerCase();
  const text = `${category} ${subcategory} ${question}`;

  // Check category/subcategory first (most reliable - matches Polymarket's structure)
  // Polymarket uses: "Counter-Strike", "League of Legends", "Dota 2", "Valorant"

  // Check League of Legends FIRST to avoid false matches with CS2 team names
  if (
    category.includes("league of legends") ||
    category.includes("league-of-legends") ||
    subcategory.includes("league of legends") ||
    subcategory.includes("league-of-legends") ||
    question.includes("league of legends") ||
    question.includes(" lol ") ||
    question.startsWith("lol:") ||
    question.includes("lck") ||
    question.includes("lpl") ||
    question.includes("lec") ||
    question.includes("worlds") ||
    question.includes("msi")
  ) {
    return "lol";
  }

  // Check CS2 category/subcategory
  if (
    category.includes("counter-strike") ||
    category.includes("counter strike") ||
    subcategory.includes("counter-strike") ||
    subcategory.includes("counter strike")
  ) {
    return "cs2";
  }

  if (
    category.includes("dota 2") ||
    category.includes("dota2") ||
    category.includes("dota-2") ||
    subcategory.includes("dota 2") ||
    subcategory.includes("dota2") ||
    subcategory.includes("dota-2")
  ) {
    return "dota2";
  }

  if (category.includes("valorant") || subcategory.includes("valorant")) {
    return "valorant";
  }

  // Fallback: Check CS2 in question text (very specific patterns only)
  // Be careful - many team names overlap with LoL, so only match with CS context
  if (
    question.includes("cs2") ||
    question.includes("cs:go") ||
    question.includes("csgo") ||
    question.includes("counter-strike") ||
    question.includes("counter strike") ||
    question.includes("cs go") ||
    question.includes("cs 2") ||
    // CS-specific tournament patterns (very specific)
    question.includes("iem katowice") ||
    question.includes("iem cologne") ||
    question.includes("iem dallas") ||
    (question.includes("iem ") &&
      (question.includes("cs") || question.includes("counter"))) ||
    question.includes("blast premier") ||
    question.includes("blast.tv") ||
    (question.includes("blast ") &&
      (question.includes("cs") || question.includes("counter"))) ||
    question.includes("esl pro league") ||
    question.includes("esl one") ||
    (question.includes("pgl major") &&
      (question.includes("cs") || question.includes("counter"))) ||
    (question.includes("valve major") &&
      (question.includes("cs") || question.includes("counter"))) ||
    // CS2-specific team names ONLY if combined with CS context (avoid LoL false matches)
    (question.includes("mouz") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter"))) ||
    (question.includes("faze") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter"))) ||
    (question.includes("navi") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter"))) ||
    // CS2 event patterns (must have CS context)
    (question.includes("major") &&
      (question.includes("cs") ||
        question.includes("counter") ||
        category.includes("counter")))
  ) {
    return "cs2";
  }

  // Fallback: Check Valorant in question text
  if (
    question.includes("valorant") ||
    question.includes("vct") ||
    question.includes("champions") ||
    question.includes("masters") ||
    question.includes("challengers")
  ) {
    return "valorant";
  }

  // Fallback: Check Dota 2 in question text (more specific - avoid matching just "dota" in other contexts)
  if (
    question.includes("dota 2") ||
    question.includes("dota2") ||
    (question.includes("dota") && !question.includes("anecdota"))
  ) {
    return "dota2";
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
