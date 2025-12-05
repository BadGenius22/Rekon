import type { Market } from "@rekon/types";
import Link from "next/link";
import { API_CONFIG } from "@rekon/config";
import { formatVolume } from "@rekon/utils";
import { cn } from "@rekon/ui";
import { AppHeader } from "@/components/app-header";

async function getMarkets(
  includeResolved: boolean,
  game?: string,
  marketType: "game" | "outright" = "game"
): Promise<Market[]> {
  try {
    const url = new URL(`${API_CONFIG.baseUrl}/markets`);
    if (includeResolved) {
      url.searchParams.set("includeResolved", "true");
    }
    if (game) {
      url.searchParams.set("game", game);
    }
    // Align with home hero by default: show esports game markets (matches/maps).
    // When `marketType` is "outright", the backend will return outright markets instead.
    url.searchParams.set("type", marketType);

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

type MarketStatus = "live" | "resolved" | "outrights";

export async function MarketsPage(props: {
  searchParams: Promise<MarketsSearchParams>;
}) {
  const searchParams = await props.searchParams;

  const rawStatus = searchParams.status;
  const status: MarketStatus =
    rawStatus === "resolved" || rawStatus === "outrights" ? rawStatus : "live";

  const game = searchParams.game;

  const includeResolvedForApi = status === "resolved";
  const marketType: "game" | "outright" =
    status === "outrights" ? "outright" : "game";

  const marketsRaw = await getMarkets(includeResolvedForApi, game, marketType);
  const markets =
    status === "resolved" ? marketsRaw.filter((m) => m.isResolved) : marketsRaw;

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
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 px-4 pb-10 pt-4 md:px-6 xl:px-10">
          <div className="max-w-7xl mx-auto w-full">
            {/* Sticky markets summary bar, offset below the global navbar (AppHeader h-16) */}
            <div className="sticky top-16 z-10 mb-6 border-b border-white/5 bg-[#050816]/95 pb-4 pt-2 backdrop-blur">
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
                Professional trading terminal for prediction markets
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
                      <StatusToggle
                        label="Outrights"
                        href={buildMarketsHref({ status: "outrights", game })}
                        active={status === "outrights"}
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

            {markets.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="inline-flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-6 text-sm text-white/70">
                  <p className="font-medium">
                    No markets found for this filter.
                  </p>
                  <p className="text-xs text-white/55">
                    Try switching game or status, or go back to all live esports
                    markets.
                  </p>
                  <Link
                    href="/markets"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:border-white/40"
                  >
                    Back to all markets
                    <span aria-hidden>↺</span>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {categorized.cs2.length > 0 && (
                  <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
                    <SectionHeader
                      title="CS2 Markets"
                      markets={categorized.cs2}
                    />
                    <div className="grid gap-4">
                      {categorized.cs2.map((market) => (
                        <MarketCard key={market.id} market={market} />
                      ))}
                    </div>
                  </section>
                )}

                {categorized.lol.length > 0 && (
                  <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
                    <SectionHeader
                      title="League of Legends Markets"
                      markets={categorized.lol}
                    />
                    <div className="grid gap-4">
                      {categorized.lol.map((market) => (
                        <MarketCard key={market.id} market={market} />
                      ))}
                    </div>
                  </section>
                )}

                {categorized.dota2.length > 0 && (
                  <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
                    <SectionHeader
                      title="Dota 2 Markets"
                      markets={categorized.dota2}
                    />
                    <div className="grid gap-4">
                      {categorized.dota2.map((market) => (
                        <MarketCard key={market.id} market={market} />
                      ))}
                    </div>
                  </section>
                )}

                {categorized.valorant.length > 0 && (
                  <section className="space-y-4 mb-12 border-t border-white/5 pt-6">
                    <SectionHeader
                      title="Valorant Markets"
                      markets={categorized.valorant}
                    />
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

function SectionHeader({
  title,
  markets,
}: {
  title: string;
  markets: Market[];
}) {
  const stats = getSectionStats(markets);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2.5">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <span className="group relative ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[10px] text-white/60 cursor-default">
          i
          <span className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
            Live esports match markets only — long-dated outrights are hidden
            here.
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/55">
        <span>
          <span className="font-semibold text-white/80">{stats.live}</span> live
        </span>
        <span>•</span>
        <span>
          <span className="font-semibold text-white/80">{stats.today}</span>{" "}
          today
        </span>
        <span>•</span>
        <span>
          24h Vol{" "}
          <span className="font-mono text-[11px] font-semibold text-emerald-300">
            {formatVolume(stats.volume24h)}
          </span>
        </span>
      </div>
    </div>
  );
}

function getSectionStats(markets: Market[]): {
  live: number;
  today: number;
  volume24h: number;
} {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let live = 0;
  let today = 0;
  let volume24h = 0;

  for (const m of markets) {
    // Treat a market as live using the same semantics as the backend
    // controller: not resolved, not closed, and accepting orders.
    const isLive = !m.isResolved && !m.closed && m.acceptingOrders;

    if (isLive) {
      live += 1;
    }

    const created = m.createdAt ? new Date(m.createdAt) : undefined;
    if (created) {
      const createdDay = created.toISOString().slice(0, 10);
      if (createdDay === todayStr) {
        today += 1;
      }
    }

    volume24h += m.volume24h ?? 0;
  }

  return { live, today, volume24h };
}

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

function getTeamPrices(market: Market): {
  team1: { name: string; price: number };
  team2: { name: string; price: number };
} {
  // For esports markets, we usually have team names, not YES/NO
  if (market.outcomes.length >= 2) {
    const team1 = market.outcomes[0];
    const team2 = market.outcomes[1];

    const price1 = team1?.price ?? team1?.impliedProbability ?? 0.5;
    const price2 = team2?.price ?? team2?.impliedProbability ?? 0.5;

    return {
      team1: { name: team1.name, price: price1 },
      team2: { name: team2.name, price: price2 },
    };
  }

  // Fallback for YES/NO markets
  const yesOutcome = market.outcomes.find(
    (o) => o.name.toLowerCase() === "yes"
  );
  const noOutcome = market.outcomes.find((o) => o.name.toLowerCase() === "no");

  if (yesOutcome && noOutcome) {
    return {
      team1: { name: "YES", price: yesOutcome.price },
      team2: { name: "NO", price: noOutcome.price },
    };
  }

  // Last resort fallback
  return {
    team1: { name: "Team 1", price: 0.5 },
    team2: { name: "Team 2", price: 0.5 },
  };
}

// getTeamLogo / matchup helpers removed – team logos are not used on market cards for now.

function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getTimeBadge(startIso?: string, endIso?: string): string | undefined {
  if (!startIso && !endIso) return undefined;
  const now = new Date();

  const start = startIso ? new Date(startIso) : undefined;
  const end = endIso ? new Date(endIso) : undefined;

  if (start && now < start) {
    return `Starts in ${formatDuration(start.getTime() - now.getTime())}`;
  }

  if (end && now < end) {
    return `Ends in ${formatDuration(end.getTime() - now.getTime())}`;
  }

  if (end) {
    return `Ended ${formatDuration(now.getTime() - end.getTime())} ago`;
  }

  return undefined;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
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
  const primaryOutcome = yesOutcome || market.outcomes[0];
  const { team1, team2 } = getTeamPrices(market);

  const startLabel = market.createdAt
    ? formatDateShort(market.createdAt)
    : undefined;
  const endLabel = market.endDate ? formatDateShort(market.endDate) : undefined;
  const now = new Date();
  const endDateObj = market.endDate ? new Date(market.endDate) : undefined;
  const startDateObj = market.createdAt
    ? new Date(market.createdAt)
    : undefined;

  const isResolved = market.isResolved || market.closed;
  const isInPlay =
    !isResolved &&
    startDateObj !== undefined &&
    startDateObj.getTime() <= now.getTime() &&
    (endDateObj === undefined || endDateObj.getTime() > now.getTime());
  const isLivePreStart =
    !isResolved &&
    !isInPlay &&
    endDateObj !== undefined &&
    endDateObj.getTime() > now.getTime();

  let statusLabel: "Live" | "In-play" | "Resolved";
  if (isResolved) {
    statusLabel = "Resolved";
  } else if (isInPlay) {
    statusLabel = "In-play";
  } else {
    statusLabel = "Live";
  }

  const showTimeBadge = !isResolved && (isInPlay || isLivePreStart);
  const timeBadge = showTimeBadge
    ? getTimeBadge(market.createdAt, market.endDate)
    : undefined;

  const volume24h = market.volume24h ?? 0;
  const priceChange24h = market.priceChange24h ?? 0;
  const hasPriceChange = priceChange24h !== 0;
  const priceChangePct = priceChange24h * 100;

  return (
    <Link
      href={`/markets/${market.slug || market.id}`}
      className={`group border border-white/10 rounded-xl bg-[#121A30] hover:border-white/20 transition-all hover:shadow-[0_8px_24px_rgba(15,23,42,0.8)] cursor-pointer ${
        compact ? "p-5" : "p-6"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {market.imageUrl && (
              <div className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={market.imageUrl}
                  alt={market.question}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <h3
                className={`font-semibold text-white leading-snug ${
                  compact ? "text-base" : "text-lg"
                }`}
              >
                {market.question}
              </h3>
              {(startLabel || endLabel) && (
                <div className="mt-1 text-[11px] text-white/50">
                  {startLabel && endLabel
                    ? `${startLabel} → ${endLabel}`
                    : endLabel ?? startLabel}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/60">
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
              {(primaryOutcome.price * 100).toFixed(2)}%
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                  statusLabel === "Resolved"
                    ? "bg-orange-500/15 text-orange-300 border border-orange-500/40"
                    : statusLabel === "In-play"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                    : "bg-sky-500/10 text-sky-300 border border-sky-500/40"
                )}
              >
                {statusLabel}
              </span>
              {timeBadge && (
                <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/70 border border-white/15">
                  {timeBadge}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Team vs team layout with outcome chips */}
      <div className="mt-5">
        <div className="flex items-center justify-center gap-2.5">
          <OutcomeChip label={team1.name} value={team1.price} positive />
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            VS
          </span>
          <OutcomeChip label={team2.name} value={team2.price} />
        </div>
        {(volume24h > 0 || hasPriceChange) && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/55">
            <span>
              24h Vol{" "}
              <span className="font-mono text-[11px] font-semibold text-emerald-300">
                {formatVolume(volume24h)}
              </span>
            </span>
            {hasPriceChange && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-[11px] font-semibold",
                  priceChangePct > 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                <span aria-hidden>{priceChangePct > 0 ? "↑" : "↓"}</span>
                <span>{Math.abs(priceChangePct).toFixed(2)}%</span>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Vol {formatVolume(market.volume)}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>Liq {formatVolume(market.liquidity)}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400">
            <span>View market</span>
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function OutcomeChip({
  label,
  value,
  positive,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  const pct = (value * 100).toFixed(2);
  const percentage = Math.max(0, Math.min(100, value * 100)); // Clamp to 0-100

  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-between overflow-hidden rounded-lg border px-3 py-2.5 text-xs",
        positive
          ? "border-emerald-500/50 bg-emerald-500/12 text-emerald-300"
          : "border-red-500/50 bg-red-500/12 text-red-300"
      )}
    >
      {/* Progress bar background */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300",
          positive ? "bg-emerald-500/20" : "bg-red-500/20"
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full items-center justify-between">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-sm font-bold">{pct}%</span>
      </div>
    </div>
  );
}
