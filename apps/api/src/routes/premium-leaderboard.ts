/**
 * Premium Leaderboard Routes
 *
 * Endpoints for x402 premium content leaderboard and user statistics.
 * Used to showcase x402 protocol integration to hackathon judges.
 *
 * Endpoints:
 * - GET /premium/leaderboard?limit=100          - All-time leaderboard
 * - GET /premium/stats/:address                 - User stats and ranking
 * - GET /premium/history/:address?limit=50      - Purchase history
 */

import { Hono } from "hono";
import {
  getLeaderboardController,
  getUserStatsController,
  getPurchaseHistoryController,
} from "../controllers/premium-leaderboard.js";

const premiumLeaderboardRoutes = new Hono()
  .get("/leaderboard", getLeaderboardController)
  .get("/stats/:address", getUserStatsController)
  .get("/history/:address", getPurchaseHistoryController);

export { premiumLeaderboardRoutes };
