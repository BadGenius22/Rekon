import { cn } from "@rekon/ui";

interface WatchlistItem {
  label: string;
  yesPrice: number;
  noPrice: number;
}

interface WatchlistPanelProps {
  items: WatchlistItem[];
  action?: string;
  onActionClick?: () => void;
}

export function WatchlistPanel({
  items,
  action,
  onActionClick,
}: WatchlistPanelProps) {
  return (
    <Panel>
      <PanelHeader title="Watchlist" action={action} onActionClick={onActionClick} />
      <div className="space-y-2.5 text-xs">
        {items.map((item, index) => (
          <WatchlistRow
            key={index}
            label={item.label}
            yesPrice={item.yesPrice}
            noPrice={item.noPrice}
          />
        ))}
      </div>
    </Panel>
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
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#090E1C] px-3.5 py-2.5 transition-colors hover:border-white/15 hover:bg-white/5">
      <div className="flex-1 text-xs">
        <div className="line-clamp-1 font-medium text-white/80">{label}</div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            YES {(yesPrice * 100).toFixed(0)}%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            NO {(noPrice * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
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

