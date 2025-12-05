import { cn } from "@rekon/ui";

interface PortfolioSnapshotProps {
  netExposure: number;
  totalPnL: number;
  openPositions: number;
  lifetimePositions: number;
  esportsShare?: number; // 0–1, esports exposure / total Polymarket exposure
}

export function PortfolioSnapshot({
  netExposure,
  totalPnL,
  openPositions,
  lifetimePositions,
  esportsShare,
}: PortfolioSnapshotProps) {
  const clampedShare =
    typeof esportsShare === "number"
      ? Math.max(0, Math.min(1, esportsShare))
      : undefined;
  const sharePercent = clampedShare !== undefined ? clampedShare * 100 : undefined;

  return (
    <Panel>
      <PanelHeader title="Portfolio Snapshot" />
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-white/50">
              Esports exposure
            </span>
            <span className="block font-mono text-lg font-semibold text-white">
              $
              {netExposure.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] uppercase tracking-wide text-white/50">
              Total PnL
            </span>
            <span
              className={cn(
                "font-mono text-base font-semibold",
                totalPnL >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {totalPnL >= 0 ? "+" : ""}$
              {totalPnL.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>Esports share of Polymarket book</span>
            {sharePercent !== undefined ? (
              <span className="font-mono text-[11px] text-white/80">
                {sharePercent.toFixed(0)}%
              </span>
            ) : null}
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/80 via-cyan-400/80 to-sky-500/80 opacity-60 blur-[2px]" />
            <div
              className="relative h-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-[width] duration-300"
              style={{
                width:
                  sharePercent !== undefined
                    ? `${Math.max(4, Math.min(100, sharePercent))}%`
                    : "0%",
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-white/65">
          <span className="text-[11px] uppercase tracking-wide">
            Positions
          </span>
          <span className="font-mono text-xs">
            {openPositions} open • {lifetimePositions} lifetime
          </span>
        </div>
      </div>
    </Panel>
  );
}

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-[#050816] to-sky-500/20 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.9)] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function PanelHeader({
  title,
}: {
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
        {title}
      </span>
    </div>
  );
}
