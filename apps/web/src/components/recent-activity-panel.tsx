import { cn } from "@rekon/ui";
import type { Activity } from "@rekon/types";

interface RecentActivityPanelProps {
  items: Activity[];
}

export function RecentActivityPanel({ items }: RecentActivityPanelProps) {
  return (
    <Panel className="flex flex-col h-full">
      <PanelHeader title="Recent Activity" />
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-start gap-2.5 text-xs text-white/70 pr-1">
        {items.map((item, index) => (
          <ActivityRow
            key={`${item.id}-${item.timestamp}-${item.amount ?? 0}-${index}`}
            label={item.label}
            meta={item.meta}
            positive={item.positive}
          />
        ))}
      </div>
    </Panel>
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
  const metaParts = meta
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col justify-center rounded-lg border border-white/10 bg-gradient-to-r from-white/5 via-[#050816] to-transparent px-3 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.6)] transition-colors hover:border-white/20 hover:from-emerald-500/10 hover:via-[#050816] hover:to-sky-500/10">
      <div className="flex items-center gap-2 text-[11px] leading-snug">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            positive ? "bg-emerald-400" : "bg-sky-400"
          )}
        />
        <span className="line-clamp-2 text-[11px] font-medium text-white/85">
          {label}
        </span>
      </div>
      <div className="mt-1.5 pl-3.5 flex flex-wrap gap-1.5 text-[11px] text-white/60">
        {metaParts.map((part, index) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5"
          >
            {part}
          </span>
        ))}
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
