import Link from "next/link";
import { TrendingUp, Bell, Wallet, Search, ArrowRight } from "lucide-react";
import { cn } from "@rekon/ui";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#030711] text-white">
      {/* App shell background */}
      <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#030711] to-black">
        {/* Top navigation */}
        <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050816]/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
            {/* Logo + name */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6] shadow-[0_0_30px_rgba(59,130,246,0.6)]" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-wide text-white">
                  Rekon
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
                  Esports Markets
                </span>
              </div>
            </div>

            {/* Primary nav */}
            <nav className="hidden flex-1 items-center gap-5 text-xs font-medium text-white/60 md:flex">
              <NavItem active>Markets</NavItem>
              <NavItem>Dashboards</NavItem>
              <NavItem>Activity</NavItem>
              <NavItem>Ranks</NavItem>
              <NavItem>Rewards</NavItem>
            </nav>

            {/* Search + actions */}
            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#0C1224] px-3 py-1.5 text-xs text-white/60 shadow-[0_0_25px_rgba(15,23,42,0.9)] md:flex">
                <Search className="h-3.5 w-3.5 text-white/40" />
                <input
                  placeholder="Search teams, events, markets"
                  className="w-44 bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
                <kbd className="rounded-md bg-[#121A30] px-1.5 py-0.5 text-[10px] text-white/45">
                  ⌘K
                </kbd>
              </div>

              <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#090E1C] text-white/60 hover:border-white/30 hover:text-white transition-colors">
                <Bell className="h-3.5 w-3.5" />
              </button>

              <button className="hidden items-center gap-2 rounded-full bg-[#FACC15] px-3 py-1.5 text-xs font-semibold text-[#020617] shadow-[0_8px_24px_rgba(250,204,21,0.45)] hover:brightness-105 active:scale-[0.98] transition-all md:inline-flex">
                <Wallet className="h-3.5 w-3.5" />
                <span>Connect wallet</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main grid */}
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-10 pt-6 md:flex-row md:gap-6 md:px-6">
          {/* Left: hero + markets */}
          <section className="flex-1 space-y-5">
            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1D4ED8] via-[#22D3EE] to-[#8B5CF6] shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.85),transparent_55%)]" />
              <div className="relative flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3 md:max-w-md">
                  <div className="inline-flex items-center gap-2 rounded-full bg-black/10 px-2 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]" />
                    Live esports probabilities
                  </div>
                  <h1 className="text-balance text-2xl font-bold leading-tight text-white md:text-3xl">
                    Pro terminal for{" "}
                    <span className="underline decoration-white/70 decoration-wavy underline-offset-4">
                      esports prediction markets
                    </span>
                  </h1>
                  <p className="text-sm text-white/80">
                    Streamlined order tickets, depth-aware pricing, and
                    portfolio intelligence on top of Polymarket liquidity.
                    Optimized for CS2, League, and Valorant action.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href="/markets"
                      className="inline-flex items-center gap-2 rounded-full bg-[#0B1020] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_28px_rgba(15,23,42,0.8)] hover:bg-black transition-colors"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Browse live markets</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] text-white/80">
                      <span className="inline-flex h-5 items-center rounded-full bg-black/20 px-2 font-medium">
                        CS2 Major • Valorant Champs • Worlds Qualifiers
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-black/15 p-3 text-xs text-white/85 backdrop-blur-sm md:mt-0 md:w-64">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>24h Volume (builder)</span>
                    <span className="font-mono font-semibold text-emerald-300">
                      $1.23M
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Live markets</span>
                    <span className="font-mono font-semibold">128</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Top rank</span>
                    <span className="font-mono font-semibold text-cyan-300">
                      #5 Polymarket builder
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shortcut bar */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
              <ShortcutPill active>LIVE</ShortcutPill>
              <ShortcutPill>Today</ShortcutPill>
              <ShortcutPill>This week</ShortcutPill>
              <ShortcutPill>CS2</ShortcutPill>
              <ShortcutPill>League</ShortcutPill>
              <ShortcutPill>Valorant</ShortcutPill>
            </div>

            {/* Markets grid (static placeholder for now) */}
            <div className="grid gap-3 md:grid-cols-2">
              <MarketCard
                title="Will Team A win the CS2 Grand Final?"
                subtitle="IEM Katowice • Match winner"
                yesPrice={0.64}
                noPrice={0.36}
                volume="$842k"
                liquidity="$210k"
                badge="Trending"
              />
              <MarketCard
                title="Will DRX reach Valorant Champions semifinals?"
                subtitle="Valorant Champions • Advancement"
                yesPrice={0.42}
                noPrice={0.58}
                volume="$421k"
                liquidity="$98k"
                badge="New"
              />
              <MarketCard
                title="Will G2 win at least 2 maps vs Vitality?"
                subtitle="CS2 • Map handicap"
                yesPrice={0.31}
                noPrice={0.69}
                volume="$190k"
                liquidity="$55k"
              />
              <MarketCard
                title="Will T1 qualify for Worlds 2025?"
                subtitle="League of Legends • Season futures"
                yesPrice={0.72}
                noPrice={0.28}
                volume="$603k"
                liquidity="$154k"
              />
            </div>
          </section>

          {/* Right column panels */}
          <aside className="mt-2 w-full space-y-4 md:mt-0 md:w-72">
            <Panel>
              <PanelHeader title="Portfolio snapshot" action="Open terminal" />
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Net exposure</span>
                  <span className="font-mono text-sm font-semibold text-white">
                    $12,430.25
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/50">Unrealized PnL</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    +$1,023.15
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/50">Realized PnL (30d)</span>
                  <span className="font-mono font-semibold text-emerald-300">
                    +$3,210.88
                  </span>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center justify-between text-[11px] text-white/55">
                  <span>Positions</span>
                  <span className="font-mono">8 open • 23 lifetime</span>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Watchlist" action="View all" />
              <div className="space-y-2 text-xs">
                <WatchlistRow
                  label="Will FaZe win the CS2 Major?"
                  yesPrice={0.58}
                  noPrice={0.42}
                />
                <WatchlistRow
                  label="Will Gen.G win VCT Pacific?"
                  yesPrice={0.47}
                  noPrice={0.53}
                />
                <WatchlistRow
                  label="Will Liquid qualify for playoffs?"
                  yesPrice={0.66}
                  noPrice={0.34}
                />
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Recent builder activity" />
              <div className="space-y-2 text-[11px] text-white/70">
                <ActivityRow
                  label="User filled 1.2k YES on CS2 Grand Final"
                  meta="2m ago • $680 filled • 1.3% move"
                  positive
                />
                <ActivityRow
                  label="Large NO block on Valorant DRX semifinals"
                  meta="9m ago • $3.4k filled • 4.8% move"
                />
                <ActivityRow
                  label="Portfolio rebalance across Worlds futures"
                  meta="21m ago • 6 markets touched"
                />
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

function NavItem({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={cn(
        "relative px-1.5 py-1 text-xs transition-colors",
        active ? "text-white" : "text-white/55 hover:text-white"
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-[#3B82F6] via-[#22D3EE] to-[#8B5CF6]" />
      ) : null}
    </button>
  );
}

function ShortcutPill({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
        active
          ? "border-white/40 bg-white/10 text-white"
          : "border-white/10 bg-[#090E1C] text-white/65 hover:border-white/30 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0C1224] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.9)]">
      {children}
    </div>
  );
}

function PanelHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between text-xs">
      <span className="font-medium text-white/70">{title}</span>
      {action ? (
        <button className="text-[11px] font-medium text-[#3B82F6] hover:text-[#60A5FA]">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function MarketCard({
  title,
  subtitle,
  yesPrice,
  noPrice,
  volume,
  liquidity,
  badge,
}: {
  title: string;
  subtitle: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  liquidity: string;
  badge?: "New" | "Trending";
}) {
  return (
    <button className="group flex h-40 flex-col justify-between rounded-2xl border border-white/10 bg-[#121A30] p-4 text-left text-xs shadow-[0_16px_40px_rgba(15,23,42,0.95)] transition-all hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_22px_60px_rgba(15,23,42,1)]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="line-clamp-2 text-[13px] font-semibold text-white">
            {title}
          </h2>
          <p className="text-[11px] text-white/55">{subtitle}</p>
        </div>
        {badge ? (
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold",
              badge === "New"
                ? "bg-emerald-400 text-black"
                : "bg-orange-400 text-black"
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <OutcomeChip label="YES" value={yesPrice} positive />
        <OutcomeChip label="NO" value={noPrice} />
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Vol {volume}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          <span>Liq {liquidity}</span>
        </span>
      </div>
    </button>
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
  const pct = (value * 100).toFixed(0);
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-between rounded-xl border px-3 py-2 text-[11px]",
        positive
          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
          : "border-red-500/60 bg-red-500/10 text-red-300"
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="font-mono text-xs">{pct}%</span>
    </div>
  );
}

function WatchlistRow({
  label,
  yesPrice,
  noPrice,
}: {
  label: string;
  yesPrice: number;
  noPrice: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-[#090E1C] px-3 py-2">
      <div className="flex-1 text-[11px]">
        <div className="line-clamp-1 font-medium text-white/75">{label}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/45">
          <span className="inline-flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            YES {(yesPrice * 100).toFixed(0)}%
          </span>
          <span className="inline-flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            NO {(noPrice * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({
  label,
  meta,
  positive,
}: {
  label: string;
  meta: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#050816] px-3 py-2">
      <div className="flex items-center gap-2 text-[11px]">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            positive ? "bg-emerald-400" : "bg-sky-400"
          )}
        />
        <span className="line-clamp-2 text-white/80">{label}</span>
      </div>
      <div className="mt-1 pl-3 text-[10px] text-white/45">{meta}</div>
    </div>
  );
}
