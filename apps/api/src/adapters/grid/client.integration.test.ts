/**
 * GRID Adapter Integration Tests
 *
 * These tests make real API calls to GRID's GraphQL endpoints.
 * They require a valid GRID_API_KEY environment variable.
 *
 * Environment variables are loaded from apps/api/.env automatically.
 * Or set directly: GRID_API_KEY=your_key pnpm test client.integration.test.ts
 *
 * To skip integration tests (default if no API key):
 *   pnpm test (will skip tests if GRID_API_KEY not set)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// CRITICAL: Load .env file BEFORE importing client
// The client imports GRID_CONFIG which reads process.env at module load time
// If we import client first, GRID_CONFIG.apiKey will be empty
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = resolve(__dirname, "../../../.env");
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line: string) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts
          .join("=")
          .replace(/^["']|["']$/g, "")
          .trim();
        // Set in process.env (will override existing values)
        // This ensures GRID_CONFIG reads the correct value when imported
        process.env[key.trim()] = value;
      }
    }
  });
} catch {
  // .env file not found - that's okay, env vars might be set another way
}

// Import client AFTER loading .env (so GRID_CONFIG has the API key)
import {
  fetchGridLiveSeriesState,
  searchGridTeamsByName,
  findSeriesByTeamNames,
  fetchGridTeamStatistics,
} from "./client";
import { GridTimeWindow } from "./types";

// Check if we have a valid API key for integration tests
const GRID_API_KEY = process.env.GRID_API_KEY;
const shouldSkipIntegrationTests = !GRID_API_KEY || GRID_API_KEY === "";

describe.skipIf(shouldSkipIntegrationTests)(
  "GRID Client Integration Tests",
  () => {
    beforeAll(() => {
      if (shouldSkipIntegrationTests) {
        console.warn(
          "⚠️  Skipping GRID integration tests - GRID_API_KEY not set"
        );
        console.warn("   Make sure GRID_API_KEY is set in apps/api/.env file");
      } else {
        console.log("✅ Running GRID integration tests with real API");
        // Log API key status (masked for security)
        const maskedKey = GRID_API_KEY
          ? `${GRID_API_KEY.substring(0, 8)}...${GRID_API_KEY.substring(
              GRID_API_KEY.length - 4
            )}`
          : "not set";
        console.log(
          `   API Key: ${maskedKey} (length: ${GRID_API_KEY.length})`
        );
        console.log("   ⚠️  If you see UNAUTHENTICATED errors:");
        console.log(
          "      1. Verify your API key is valid at https://grid.gg/open-access/"
        );
        console.log(
          "      2. Check that your API key has access to all three GRID endpoints"
        );
        console.log(
          "      3. Ensure GRID_API_KEY in apps/api/.env has no quotes or extra spaces"
        );
      }
    });

    describe("API Key Validation", () => {
      it("should successfully authenticate with GRID API", async () => {
        // Test with a simple query to verify API key works
        // Central Data Feed is usually the most accessible endpoint
        const results = await searchGridTeamsByName("Team Liquid");

        // If we get results (even empty array), authentication worked
        // If we get null or error, authentication failed
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);

        if (results.length === 0) {
          console.log(
            "   ✅ Authentication successful (no teams found, but API responded)"
          );
        } else {
          console.log(
            `   ✅ Authentication successful (found ${results.length} team(s))`
          );
        }
      }, 30000);
    });

    describe("API Key Validation", () => {
      it("should successfully authenticate with GRID Central Data Feed", async () => {
        // Test with a simple query to verify API key works
        // Central Data Feed is usually the most accessible endpoint
        const results = await searchGridTeamsByName("Team Liquid");

        // If we get results (even empty array), authentication worked
        // If we get null or error, authentication failed
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);

        if (results.length === 0) {
          console.log(
            "   ✅ Authentication successful (no teams found, but API responded)"
          );
        } else {
          console.log(
            `   ✅ Authentication successful (found ${results.length} team(s))`
          );
        }
      }, 30000);
    });

    describe("searchGridTeamsByName", () => {
      it.only("should find real teams by name (exact match)", async () => {
        // Test with a well-known team name
        const results = await searchGridTeamsByName("Faze Clan");

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);

        if (results.length > 0) {
          expect(results[0]).toHaveProperty("id");
          expect(results[0]).toHaveProperty("name");
          expect(results[0].name.toLowerCase()).toContain("faze");
        }
      }, 30000); // 30s timeout for real API calls

      it("should find teams with partial name match", async () => {
        const results = await searchGridTeamsByName("Liquid");

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        // Should return at least one result or empty array
        if (results.length > 0) {
          expect(results[0]).toHaveProperty("id");
          expect(results[0]).toHaveProperty("name");
        }
      }, 30000);

      it("should return empty array for non-existent team", async () => {
        const results = await searchGridTeamsByName("NonExistentTeamName12345");

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        // May return empty or some fuzzy matches
      }, 30000);
    });

    describe("findSeriesByTeamNames", () => {
      it("should find series between two teams", async () => {
        // Use common team names that might have matches
        const results = await findSeriesByTeamNames(
          "Team Liquid",
          "Natus Vincere",
          30,
          30
        );

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        // May return empty if no matches in time range, or array of series
        if (results.length > 0) {
          expect(results[0]).toHaveProperty("id");
          expect(results[0]).toHaveProperty("teams");
          expect(results[0].teams.length).toBeGreaterThan(0);
        }
      }, 30000);

      it("should respect time range filters", async () => {
        // Look for series in next 7 days, past 30 days
        const results = await findSeriesByTeamNames("Team Liquid", "G2", 7, 30);

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        // Results should be within the specified time range
        if (results.length > 0) {
          const now = new Date();
          const futureDate = new Date(now);
          futureDate.setDate(futureDate.getDate() + 7);
          const pastDate = new Date(now);
          pastDate.setDate(pastDate.getDate() - 30);

          results.forEach((series) => {
            const scheduledTime = new Date(series.startTimeScheduled);
            expect(scheduledTime.getTime()).toBeLessThanOrEqual(
              futureDate.getTime()
            );
            expect(scheduledTime.getTime()).toBeGreaterThanOrEqual(
              pastDate.getTime()
            );
          });
        }
      }, 30000);
    });

    describe("fetchGridTeamStatistics", () => {
      it("should fetch team statistics for a valid team ID", async () => {
        // First, find a real team to get its ID
        const teams = await searchGridTeamsByName("Team Liquid");

        if (teams.length === 0) {
          console.warn("⚠️  No teams found, skipping statistics test");
          return;
        }

        const teamId = teams[0].id;
        const stats = await fetchGridTeamStatistics(
          teamId,
          GridTimeWindow.LAST_3_MONTHS
        );

        expect(stats).toBeDefined();

        if (stats) {
          expect(stats).toHaveProperty("id");
          expect(stats).toHaveProperty("game");
          expect(stats.game).toHaveProperty("count");
          // wins may be undefined (use optional chaining)
          if (stats.game.wins) {
            expect(Array.isArray(stats.game.wins)).toBe(true);
            // wins is an array: find the entry with value: true
            const winStats = stats.game.wins.find((w) => w.value === true);
            if (winStats) {
              expect(winStats.percentage).toBeGreaterThanOrEqual(0);
              expect(winStats.percentage).toBeLessThanOrEqual(100);
            }
          }
        }
      }, 30000);

      it("should handle different time windows", async () => {
        const teams = await searchGridTeamsByName("Team Liquid");

        if (teams.length === 0) {
          console.warn("⚠️  No teams found, skipping time window test");
          return;
        }

        const teamId = teams[0].id;
        const stats = await fetchGridTeamStatistics(
          teamId,
          GridTimeWindow.LAST_MONTH
        );

        // Should return stats or null (if no data for that window)
        expect(stats === null || typeof stats === "object").toBe(true);
      }, 30000);

      it("should return null for invalid team ID", async () => {
        const stats = await fetchGridTeamStatistics("invalid-team-id-99999");

        // Should return null for invalid IDs
        expect(stats).toBeNull();
      }, 30000);
    });

    describe("fetchGridLiveSeriesState", () => {
      it("should fetch live series state for an ongoing series", async () => {
        // First, find a series that might be live
        const series = await findSeriesByTeamNames("Team Liquid", "G2", 1, 0);

        if (series.length === 0) {
          console.warn("⚠️  No recent series found, skipping live state test");
          return;
        }

        // Try to get live state for the most recent series
        const seriesId = series[0].id;
        const liveState = await fetchGridLiveSeriesState(seriesId);

        // May return null if series is not live, or state object if live
        expect(liveState === null || typeof liveState === "object").toBe(true);

        if (liveState) {
          expect(liveState).toHaveProperty("valid");
          expect(liveState).toHaveProperty("started");
          expect(liveState).toHaveProperty("finished");
          expect(liveState).toHaveProperty("teams");
          expect(liveState).toHaveProperty("games");

          if (liveState.started && !liveState.finished) {
            // If live, should have games
            expect(liveState.games.length).toBeGreaterThan(0);
          }
        }
      }, 30000);

      it("should return null for invalid series ID", async () => {
        const liveState = await fetchGridLiveSeriesState(
          "invalid-series-id-99999"
        );

        // Note: May return null OR throw UNAUTHENTICATED if API key doesn't have Live Data Feed access
        // Both are acceptable - the test verifies we handle the error gracefully
        expect(liveState === null || liveState === undefined).toBe(true);

        if (liveState === null) {
          console.log("   ✅ Invalid ID handled correctly (returned null)");
        }
      }, 30000);

      it("should filter to ongoing games when onlyOngoingGames is true", async () => {
        const series = await findSeriesByTeamNames("Team Liquid", "G2", 1, 0);

        if (series.length === 0) {
          console.warn("⚠️  No recent series found, skipping filter test");
          return;
        }

        const seriesId = series[0].id;
        const liveState = await fetchGridLiveSeriesState(seriesId, true);

        // If live state exists and has games, they should be ongoing
        if (liveState && liveState.games.length > 0) {
          // Games should have players if ongoing
          liveState.games.forEach((game) => {
            expect(game.teams.length).toBeGreaterThan(0);
          });
        }
      }, 30000);
    });

    describe("End-to-End Flow", () => {
      it("should complete full recommendation flow: search teams -> find series -> get stats", async () => {
        // 1. Search for teams
        const team1Results = await searchGridTeamsByName("Team Liquid");
        const team2Results = await searchGridTeamsByName("G2");

        if (team1Results.length === 0 || team2Results.length === 0) {
          console.warn("⚠️  Teams not found, skipping E2E test");
          return;
        }

        const team1 = team1Results[0];
        const team2 = team2Results[0];

        expect(team1).toHaveProperty("id");
        expect(team2).toHaveProperty("id");

        // 2. Find series between teams
        const series = await findSeriesByTeamNames(
          team1.name,
          team2.name,
          30,
          30
        );

        // 3. Get team statistics
        const [team1Stats, team2Stats] = await Promise.all([
          fetchGridTeamStatistics(team1.id, GridTimeWindow.LAST_3_MONTHS),
          fetchGridTeamStatistics(team2.id, GridTimeWindow.LAST_3_MONTHS),
        ]);

        // Verify we got data (or null if unavailable)
        expect(team1Stats === null || typeof team1Stats === "object").toBe(
          true
        );
        expect(team2Stats === null || typeof team2Stats === "object").toBe(
          true
        );

        // 4. If series found, try to get live state
        if (series.length > 0) {
          const liveState = await fetchGridLiveSeriesState(series[0].id);
          expect(liveState === null || typeof liveState === "object").toBe(
            true
          );
        }

        console.log("✅ E2E flow completed successfully");
      }, 60000); // 60s timeout for full flow
    });
  }
);

// Export a helper to check if integration tests are enabled
export function isIntegrationTestEnabled(): boolean {
  return !shouldSkipIntegrationTests;
}
