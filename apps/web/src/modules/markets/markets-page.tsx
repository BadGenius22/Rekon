import type { Market } from "@rekon/types";
import Link from "next/link";
import { API_CONFIG } from "@rekon/config";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/modules/home/app-footer";
import { ScrollToTop } from "@/components/scroll-to-top";
import { MarketsPageClient } from "./markets-page-client";

async function getMarkets(
  includeResolved: boolean,
  game?: string
): Promise<Market[]> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/markets`);
    if (includeResolved) {
      url.searchParams.set("includeResolved", "true");
      // Explicitly request closed markets when fetching resolved ones
      url.searchParams.set("closed", "true");
    }
    if (game) {
      url.searchParams.set("game", game);
    }
    // Always fetch game markets (matches/maps)
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

interface MarketsSearchParams {
  includeResolved?: string;
  game?: string;
  status?: string;
}

type MarketStatus = "live" | "resolved";

export async function MarketsPage(props: {
  searchParams: Promise<MarketsSearchParams>;
}) {
  const searchParams = await props.searchParams;

  const rawStatus = searchParams.status;
  const status: MarketStatus = rawStatus === "resolved" ? "resolved" : "live";

  const game = searchParams.game;

  const includeResolvedForApi = status === "resolved";

  const marketsRaw = await getMarkets(includeResolvedForApi, game);
  const markets =
    status === "resolved" ? marketsRaw.filter((m) => m.isResolved) : marketsRaw;

  // Calculate totals (same as home page)
  const liveMarketsCount = markets.length;
  const total24hVolume = markets.reduce(
    (sum, market) => sum + (market.volume24h ?? market.volume ?? 0),
    0
  );

  // Markets are categorized in the client component

  return (
    <div className="min-h-screen bg-[#030711] text-white">
      <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#030711] to-black">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 pb-10 pt-4 md:px-6 xl:px-10">
          <div className="max-w-7xl mx-auto w-full">
            {/* Markets summary bar with filters */}
            <div className="mb-6 border-b border-white/5 bg-[#050816] pb-4 pt-2">
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
              <p className="text-sm text-white/65 mb-4">
                Trade esports prediction markets
              </p>
              <div className="flex flex-col gap-3">
                {/* Game filter chips */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                    Game
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="All"
                      href={buildMarketsHref({ status })}
                      active={!game}
                    />
                    <FilterChip
                      label="CS2"
                      href={buildMarketsHref({ status, game: "cs2" })}
                      active={game === "cs2"}
                    />
                    <FilterChip
                      label="LoL"
                      href={buildMarketsHref({ status, game: "lol" })}
                      active={game === "lol"}
                    />
                    <FilterChip
                      label="Dota 2"
                      href={buildMarketsHref({ status, game: "dota2" })}
                      active={game === "dota2"}
                    />
                    <FilterChip
                      label="Valorant"
                      href={buildMarketsHref({ status, game: "valorant" })}
                      active={game === "valorant"}
                    />
                  </div>
                </div>

                {/* Status toggles + summary */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
                      Status
                    </span>
                    <div className="inline-flex rounded-lg bg-white/5 p-1">
                      <StatusToggle
                        label="Live"
                        href={buildMarketsHref({ status: "live", game })}
                        active={status === "live"}
                      />
                      <StatusToggle
                        label="Resolved"
                        href={buildMarketsHref({ status: "resolved", game })}
                        active={status === "resolved"}
                      />
                    </div>
                  </div>

                  {markets.length > 0 && (
                    <div className="flex items-center gap-3 text-xs text-white/60">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                          24h Volume
                        </span>
                        <span className="font-mono text-sm font-semibold text-emerald-300">
                          {formatVolume(total24hVolume)}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                          Markets
                        </span>
                        <span className="font-mono text-sm font-semibold text-emerald-300">
                          {liveMarketsCount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Market listings with watchlist filter */}
            <MarketsPageClient markets={markets} game={game} status={status} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 sm:mt-16 md:mt-20 lg:mt-24">
          <AppFooter />
        </div>
      </div>

      {/* Scroll to top button */}
      <ScrollToTop />
    </div>
  );
}

// Market categorization and rendering moved to MarketsPageClient component

async function getTeams(): Promise<TeamMeta[]> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/teams`);
    const response = await fetch(url.toString(), {
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      console.warn("Failed to fetch teams:", response.status);
      return [];
    }
    const data = (await response.json()) as { teams?: TeamMeta[] };
    return data.teams ?? [];
  } catch (error) {
    console.warn("Failed to fetch teams:", error);
    return [];
  }
}

function buildTeamLogoMap(teams: TeamMeta[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const team of teams) {
    if (!team.imageUrl) continue;

    const nameKey = normalizeTeamName(team.name);
    if (nameKey && !map.has(nameKey)) {
      map.set(nameKey, team.imageUrl);
    }

    if (team.shortName) {
      const shortKey = normalizeTeamName(team.shortName);
      if (shortKey && !map.has(shortKey)) {
        map.set(shortKey, team.imageUrl);
      }
    }
  }

  return map;
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function buildMarketsHref(params: {
  status?: MarketStatus;
  game?: string;
}): string {
  const search = new URLSearchParams();
  if (params.status && params.status !== "live") {
    search.set("status", params.status);
  }
  if (params.game) {
    search.set("game", params.game);
  }
  const query = search.toString();
  return query ? `/markets?${query}` : "/markets";
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/80"
      )}
    >
      {label}
    </Link>
  );
}

function StatusToggle({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-[72px] items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-white text-black shadow-sm"
          : "text-white/65 hover:text-white hover:bg-white/10"
      )}
    >
      {label}
    </Link>
  );
}
