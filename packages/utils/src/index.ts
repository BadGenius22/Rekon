// Format numbers
export function formatPrice(price: number, decimals: number = 4): string {
  return price.toFixed(decimals);
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`;
  }
  return volume.toFixed(2);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Calculate PnL
export function calculateUnrealizedPnL(
  entryPrice: number,
  currentPrice: number,
  size: number,
  side: "yes" | "no"
): number {
  if (side === "yes") {
    return (currentPrice - entryPrice) * size;
  }
  return (entryPrice - currentPrice) * size;
}

// Order book calculations
export function calculateOrderBookTotal(entries: Array<{ amount: number }>): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

// Price formatting for order book
export function formatOrderBookPrice(price: number): string {
  return price.toFixed(4);
}

// Time formatting
export function formatTimestamp(timestamp: string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function formatRelativeTime(timestamp: string | number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Validation
export function isValidPrice(price: number): boolean {
  return price > 0 && price <= 1;
}

export function isValidAmount(amount: number): boolean {
  return amount > 0;
}

// Array utilities
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<K, T[]>);
}

// Team name utilities (for Polymarket → GRID matching)
export {
  normalizeTeamName,
  extractTeamAcronym,
  calculateStringSimilarity,
  findTeamByAlias,
  getAllCS2TeamNames,
  CS2_TEAM_ALIASES,
  type TeamAliasEntry,
} from "./team-names.js";

