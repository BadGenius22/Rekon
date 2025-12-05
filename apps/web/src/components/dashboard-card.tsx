import { cn } from "@rekon/ui";

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Dashboard card component for displaying metrics and content.
 */
export function DashboardCard({ children, className }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-gradient-to-br from-[#0C1224] to-[#080B16] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.9)] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DashboardCardHeaderProps {
  children: React.ReactNode;
}

export function DashboardCardHeader({ children }: DashboardCardHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

interface DashboardCardTitleProps {
  children: React.ReactNode;
}

export function DashboardCardTitle({ children }: DashboardCardTitleProps) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
      {children}
    </h3>
  );
}

interface DashboardCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardCardContent({
  children,
  className,
}: DashboardCardContentProps) {
  return <div className={cn("", className)}>{children}</div>;
}
