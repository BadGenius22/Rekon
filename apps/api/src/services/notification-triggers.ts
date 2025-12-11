import { enqueueNotification } from "./notifications";
import { getAlertsByMarketId, updateAlert } from "./alerts";
import { getWatchlist } from "./watchlist";
import { getMarketById } from "./markets";
import { getSession } from "./sessions";
import type { PriceAlert } from "@rekon/types";

/**
 * Notification Triggers Service
 *
 * Handles automatic notification triggering for:
 * - Price alerts (when price hits threshold)
 * - Watchlist updates (market resolved, significant price changes)
 *
 * This service should be called:
 * 1. When market prices update (via hooks in market services)
 * 2. Periodically via background worker (for comprehensive checks)
 */

const PRICE_CHANGE_THRESHOLD = 0.05; // 5% price change to trigger watchlist notification

/**
 * Checks a specific market's price against active alerts.
 * Called when market price updates.
 *
 * @param marketId - Market ID
 * @param currentPrice - Current market price (0-1)
 * @param outcome - Outcome name (optional, for multi-outcome markets)
 */
export async function checkMarketPriceAlerts(
  marketId: string,
  currentPrice: number,
  outcome?: string
): Promise<void> {
  const market = await getMarketById(marketId);
  if (!market) {
    return;
  }

  // Get all active alerts for this market
  const alerts = getAlertsByMarketId(marketId);

  for (const alert of alerts) {
    // Check if alert should trigger
    if (shouldTriggerAlert(alert, currentPrice)) {
      await triggerPriceAlertNotification(alert, currentPrice);
    }
  }
}

/**
 * Checks if a price alert condition is met.
 *
 * @param alert - Price alert
 * @param currentPrice - Current market price
 * @returns true if alert should trigger
 */
function shouldTriggerAlert(alert: PriceAlert, currentPrice: number): boolean {
  // Check if alert is active
  if (alert.status !== "active") {
    return false;
  }

  // Check if alert has expired
  if (alert.expiresAt) {
    const expiresAt = new Date(alert.expiresAt);
    if (expiresAt <= new Date()) {
      return false;
    }
  }

  // Check condition
  switch (alert.condition) {
    case "above":
      return currentPrice >= alert.alertPrice;
    case "below":
      return currentPrice <= alert.alertPrice;
    case "equals":
      return Math.abs(currentPrice - alert.alertPrice) < 0.001; // Small tolerance
    default:
      return false;
  }
}

/**
 * Triggers a price alert notification.
 *
 * @param alert - Price alert that was triggered
 * @param currentPrice - Current market price
 */
async function triggerPriceAlertNotification(
  alert: PriceAlert,
  currentPrice: number
): Promise<void> {
  const market = await getMarketById(alert.marketId);
  if (!market) {
    return;
  }

  // Get session to determine identifier (wallet or sessionId)
  const session = await getSession(alert.sessionId);
  const identifier = session?.walletAddress || alert.sessionId;

  // Mark alert as triggered
  updateAlert(alert.id, alert.sessionId, { status: "triggered" });

  // Create notification
  await enqueueNotification({
    sessionId: alert.sessionId,
    walletAddress: session?.walletAddress,
    type: "alert",
    title: "Price Alert Triggered",
    message: `${market.question} reached ${(currentPrice * 100).toFixed(1)}% (alert: ${(alert.alertPrice * 100).toFixed(1)}%)`,
    metadata: {
      alertId: alert.id,
      marketId: alert.marketId,
      marketSlug: market.slug,
      currentPrice,
      alertPrice: alert.alertPrice,
    },
  });
}

/**
 * Checks watchlist markets for updates and triggers notifications.
 * Should be called periodically or when markets are updated.
 *
 * @param sessionId - Session ID
 */
export async function checkWatchlistUpdates(sessionId: string): Promise<void> {
  const watchlist = getWatchlist(sessionId);
  if (watchlist.entries.length === 0) {
    return;
  }

  // Get session to determine identifier
  const session = await getSession(sessionId);
  if (!session) {
    return;
  }

  for (const entry of watchlist.entries) {
    const market = await getMarketById(entry.marketId);
    if (!market) {
      continue;
    }

    // Check if market was resolved
    if (market.isResolved && market.resolution) {
      await enqueueNotification({
        sessionId,
        walletAddress: session.walletAddress,
        type: "market",
        title: "Market Resolved",
        message: `${market.question} resolved: ${market.resolution}`,
        metadata: {
          marketId: market.id,
          marketSlug: market.slug,
          resolution: market.resolution,
        },
      });
    }

    // Check for significant price changes
    // Note: This requires tracking previous prices, which we'd need to implement
    // For MVP, we can skip this or implement a simple price tracking system
    // TODO: Implement price change tracking for watchlist notifications
  }
}

/**
 * Triggers notification when a market is resolved.
 * Called from market update hooks.
 *
 * @param marketId - Market ID
 * @param resolution - Market resolution
 */
export async function notifyMarketResolved(
  marketId: string,
  resolution: string
): Promise<void> {
  const market = await getMarketById(marketId);
  if (!market) {
    return;
  }

  // Find all watchlists that contain this market
  // Note: For MVP, we need to iterate through all watchlists
  // In production, you'd index watchlists by marketId for efficient lookup

  // TODO: Implement watchlist indexing by marketId for efficient lookup
  // For now, we'll check watchlists when users fetch their notifications
  // or implement a background job that periodically checks resolved markets
}

/**
 * Triggers notification for new markets matching user interests.
 * Called when new markets are created.
 *
 * @param marketId - New market ID
 * @param game - Game type (cs2, lol, dota2, valorant)
 */
export async function notifyNewMarket(
  marketId: string,
  game?: "cs2" | "lol" | "dota2" | "valorant"
): Promise<void> {
  // Find users who might be interested in this market
  // This could be based on:
  // - Users who have viewed similar markets
  // - Users who have markets from this game in their watchlist
  // - Users who have traded in this game before

  // For MVP, we can skip this or implement a simple interest tracking system
}

