import { cn } from "@rekon/ui";
import type { Activity } from "@rekon/types";

interface RecentActivityPanelProps {
  items: Activity[];
}

export function RecentActivityPanel({ items }: RecentActivityPanelProps) {
  return (
    <Panel className="flex-1 flex flex-col min-h-0">
      <PanelHeader title="Recent Activity" />
      <div className="flex-1 min-h-0 flex flex-col justify-start gap-2.5 text-xs text-white/70">
        {items.map((item) => (
          <ActivityRow
            key={item.id}
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
  return (
    <div className="flex flex-col justify-center rounded-lg border border-white/10 bg-[#050816] px-3 py-2.5 transition-colors hover:border-white/15 hover:bg-white/5">
      <div className="flex items-center gap-2 text-[11px] leading-snug">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            positive ? "bg-emerald-400" : "bg-sky-400"
          )}
        />
        <span className="line-clamp-2 text-white/80">{label}</span>
      </div>
      <div className="mt-1.5 pl-3.5 text-[11px] text-white/50">{meta}</div>
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

