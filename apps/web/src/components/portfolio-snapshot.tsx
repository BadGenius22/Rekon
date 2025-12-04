import { cn } from "@rekon/ui";

interface PortfolioSnapshotProps {
  netExposure: number;
  totalPnL: number;
  openPositions: number;
  lifetimePositions: number;
  action?: string;
  onActionClick?: () => void;
}

export function PortfolioSnapshot({
  netExposure,
  totalPnL,
  openPositions,
  lifetimePositions,
  action,
  onActionClick,
}: PortfolioSnapshotProps) {
  return (
    <Panel>
      <PanelHeader
        title="Portfolio Snapshot"
        action={action}
        onActionClick={onActionClick}
      />
      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-white/65">Net exposure</span>
          <span className="font-mono text-sm font-semibold text-white">
            $
            {netExposure.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/55">Total PnL</span>
          <span
            className={cn(
              "font-mono text-sm font-semibold",
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
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex items-center justify-between text-white/60">
          <span>Positions</span>
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
        "rounded-xl border border-white/10 bg-[#0C1224] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.8)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function PanelHeader({
  title,
  action,
  onActionClick,
}: {
  title: string;
  action?: string;
  onActionClick?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <span className="text-sm font-semibold text-white/80">{title}</span>
      {action ? (
        <button
          onClick={onActionClick}
          className="text-xs font-medium text-[#3B82F6] transition-colors hover:text-[#60A5FA]"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}
