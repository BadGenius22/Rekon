import type { Market } from "@rekon/types";
import Link from "next/link";
import { API_CONFIG } from "@rekon/config";
import { formatPrice, formatVolume, formatPercentage } from "@rekon/utils";
import { AppHeader } from "@/components/app-header";

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

  // Calculate totals (same as home page)
  const liveMarketsCount = markets.length;
  const total24hVolume = markets.reduce(
    (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
    0
  );

  // Use game field from API instead of frontend categorization
  const categorized = categorizeByGame(markets);

  return (
    <div className="min-h-screen bg-[#030711] text-white">
      <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#030711] to-black">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 pb-10 pt-6 md:px-6 xl:px-10">
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-10">
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-3xl font-bold text-white sm:text-4xl">
                  Markets
                </h1>
                {markets.length > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {liveMarketsCount} live
                  </span>
                )}
              </div>
              <p className="text-sm text-white/65 mb-6">
                Professional trading terminal for prediction markets
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm text-white/60">
                  Showing live esports game markets (matches/maps) across CS2,
                  LoL, Dota 2, and Valorant.
                </div>
                {markets.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 rounded-lg bg-white/5 border border-white/10 px-4 py-2">
                      <span className="text-xs text-white/60">24h Volume</span>
                      <span className="font-mono text-sm font-semibold text-emerald-300">
                        {formatVolume(total24hVolume)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg bg-white/5 border border-white/10 px-4 py-2">
                      <span className="text-xs text-white/60">
                        Live Markets
                      </span>
                      <span className="font-mono text-sm font-semibold text-emerald-300">
                        {liveMarketsCount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {markets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-foreground/60">No markets found</p>
              </div>
            ) : (
              <>
                {categorized.cs2.length > 0 && (
                  <section className="space-y-5 mb-12">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">
                        CS2 Markets
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
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
                  <section className="space-y-5 mb-12">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">
                        League of Legends Markets
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
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
                  <section className="space-y-5 mb-12">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">
                        Dota 2 Markets
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
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
                  <section className="space-y-5 mb-12">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">
                        Valorant Markets
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
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
                    <section className="space-y-5">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">
                          Other Markets
                        </h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70">
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
      className={`group border border-white/10 rounded-xl bg-[#121A30] hover:border-white/20 transition-all hover:shadow-[0_8px_24px_rgba(15,23,42,0.8)] ${
        compact ? "p-5" : "p-6"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-white mb-3 leading-snug ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {market.question}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Vol {formatVolume(market.volume)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Liq {formatVolume(market.liquidity)}
            </span>
            {market.isResolved && (
              <span className="text-orange-400 font-medium">Resolved</span>
            )}
          </div>
        </div>

        {primaryOutcome && (
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-emerald-300">
              {formatPrice(primaryOutcome.price)}
            </div>
            <div className="text-sm text-white/60 font-medium">
              {formatPercentage(primaryOutcome.price)}
            </div>
          </div>
        )}
      </div>

      {market.outcomes.length > 0 && (
        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="flex gap-3">
            {market.outcomes.map((outcome) => (
              <div
                key={outcome.id}
                className="flex-1 p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="text-xs text-white/60 mb-2 font-medium">
                  {outcome.name}
                </div>
                <div className="text-lg font-bold text-white">
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
