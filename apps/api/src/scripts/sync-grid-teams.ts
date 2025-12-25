/**
 * GRID Team Registry Sync Script
 *
 * Fetches all teams from GRID Central Data API and stores them in Neon Postgres.
 * This eliminates the need for on-demand pagination through 5000+ teams.
 *
 * Usage (from repo root):
 *   cd apps/api
 *   pnpm tsx --env-file=.env src/scripts/sync-grid-teams.ts
 *
 * Options:
 *   --force    Force full sync even if recently synced
 *   --status   Show current registry status without syncing
 *   --init     Initialize table schema only
 *
 * Recommended schedule:
 *   - Initial sync: Once when setting up
 *   - Refresh: Weekly via cron job or manual trigger
 *
 * Note: Uses exponential backoff and respects GRID rate limits.
 * Full sync of ~5000 teams takes approximately 5-10 minutes.
 */

import { GraphQLClient } from "graphql-request";
import { GRID_CONFIG } from "@rekon/config";
import {
  ensureTeamTableExists,
  bulkUpsertTeams,
  getTeamCount,
  getLastSyncTime,
  type CreateTeamRecordInput,
} from "../db/teams";

// ============================================================================
// Configuration
// ============================================================================

/** Maximum teams to fetch per page (GRID API limit is 50) */
const PAGE_SIZE = 50;

/** Delay between API calls to avoid rate limiting (ms) */
/** GRID rate limit: 20 requests/minute = 1 request per 3 seconds */
const API_DELAY_MS = 3500;

/** Maximum pages to fetch (safety limit) */
const MAX_PAGES = 200; // 200 * 50 = 10,000 teams max

/** Sync cooldown - don't sync if last sync was within this window */
const SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

// ============================================================================
// Types
// ============================================================================

interface GridTeam {
  id: string;
  name: string;
  colorPrimary?: string;
  colorSecondary?: string;
  logoUrl?: string;
  externalLinks?: Array<{
    dataProvider: { name: string };
    externalEntity: { id: string };
  }>;
}

interface GridConnection<T> {
  totalCount: number;
  pageInfo: {
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    startCursor: string;
    endCursor: string;
  };
  edges: Array<{
    cursor: string;
    node: T;
  }>;
}

interface TeamsResponse {
  teams: GridConnection<GridTeam>;
}

// ============================================================================
// GraphQL Query
// ============================================================================

/**
 * Query to fetch teams with pagination.
 * Note: Uses Cursor type for $after parameter (not String).
 */
const GET_TEAMS_QUERY = `
  query GetTeams($first: Int!, $after: Cursor) {
    teams(first: $first, after: $after) {
      totalCount
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          name
          colorPrimary
          colorSecondary
          logoUrl
          externalLinks {
            dataProvider {
              name
            }
            externalEntity {
              id
            }
          }
        }
      }
    }
  }
`;

// ============================================================================
// API Client
// ============================================================================

function createClient(): GraphQLClient {
  const apiKey = GRID_CONFIG.apiKey || process.env.GRID_API_KEY;

  if (!apiKey) {
    throw new Error("GRID_API_KEY is not set. Configure it in apps/api/.env");
  }

  return new GraphQLClient(GRID_CONFIG.centralDataUrl, {
    headers: {
      "x-api-key": apiKey.trim(),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Fetches a single page of teams from GRID API.
 */
async function fetchTeamsPage(
  client: GraphQLClient,
  cursor: string | null
): Promise<TeamsResponse> {
  const variables: { first: number; after: string | null } = {
    first: PAGE_SIZE,
    after: cursor,
  };

  return client.request<TeamsResponse>(GET_TEAMS_QUERY, variables);
}

/**
 * Fetches all teams from GRID API with pagination.
 * Includes rate limiting and progress logging.
 */
async function fetchAllTeams(): Promise<GridTeam[]> {
  const client = createClient();
  const allTeams: GridTeam[] = [];
  let cursor: string | null = null;
  let pageNumber = 0;
  let totalCount = 0;

  console.log("[Sync] Starting GRID team fetch...");
  console.log(`[Sync] Using endpoint: ${GRID_CONFIG.centralDataUrl}`);
  console.log(`[Sync] Page size: ${PAGE_SIZE}, delay: ${API_DELAY_MS}ms`);

  while (pageNumber < MAX_PAGES) {
    pageNumber++;

    try {
      const response = await fetchTeamsPage(client, cursor);

      if (!response?.teams?.edges) {
        console.error(`[Sync] Invalid response on page ${pageNumber}`);
        break;
      }

      const { teams } = response;
      totalCount = teams.totalCount;

      const pageTeams = teams.edges.map((edge) => edge.node);
      allTeams.push(...pageTeams);

      // Progress log
      const progress = Math.round((allTeams.length / totalCount) * 100);
      console.log(
        `[Sync] Page ${pageNumber}: Fetched ${pageTeams.length} teams ` +
          `(${allTeams.length}/${totalCount} total, ${progress}%)`
      );

      // Check if done
      if (!teams.pageInfo.hasNextPage) {
        console.log("[Sync] Reached last page");
        break;
      }

      // Update cursor for next page
      cursor = teams.pageInfo.endCursor;

      // Rate limit delay
      await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS));
    } catch (error) {
      console.error(`[Sync] Error on page ${pageNumber}:`, error);

      // Exponential backoff on error
      const backoffDelay = Math.min(API_DELAY_MS * Math.pow(2, pageNumber % 5), 10000);
      console.log(`[Sync] Backing off for ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));

      // Retry same page
      pageNumber--;

      // Safety: abort after too many retries
      if (pageNumber < 0) {
        throw new Error("Too many retries, aborting sync");
      }
    }
  }

  console.log(`[Sync] Fetch complete: ${allTeams.length} teams retrieved`);
  return allTeams;
}

// ============================================================================
// Sync Logic
// ============================================================================

/**
 * Transforms GRID teams to database records.
 */
function transformTeams(teams: GridTeam[]): CreateTeamRecordInput[] {
  return teams.map((team) => ({
    gridId: team.id,
    name: team.name,
    colorPrimary: team.colorPrimary || null,
    colorSecondary: team.colorSecondary || null,
    logoUrl: team.logoUrl || null,
    aliases: [],
    game: null, // Will be populated later based on team activity
  }));
}

/**
 * Shows the current registry status.
 */
async function showStatus(): Promise<void> {
  console.log("\n=== GRID Team Registry Status ===\n");

  try {
    const count = await getTeamCount();
    const lastSync = await getLastSyncTime();

    console.log(`Teams in registry: ${count}`);
    console.log(
      `Last sync: ${lastSync ? lastSync.toISOString() : "Never synced"}`
    );

    if (lastSync) {
      const ageMs = Date.now() - lastSync.getTime();
      const ageHours = Math.round(ageMs / 1000 / 60 / 60);
      console.log(`Sync age: ${ageHours} hours`);

      if (ageMs > SYNC_COOLDOWN_MS) {
        console.log("\nRecommendation: Sync is stale, consider refreshing");
      } else {
        console.log("\nStatus: Registry is up to date");
      }
    } else if (count === 0) {
      console.log(
        "\nRecommendation: Run sync to populate the registry"
      );
    }
  } catch (error) {
    console.error("Failed to get status:", error);
    console.log(
      "\nThe grid_teams table may not exist. Run with --init to create it."
    );
  }

  console.log("");
}

/**
 * Initializes the table schema without syncing data.
 */
async function initTable(): Promise<void> {
  console.log("[Init] Creating grid_teams table and indexes...");

  try {
    await ensureTeamTableExists();
    console.log("[Init] Table and indexes created successfully");
    await showStatus();
  } catch (error) {
    console.error("[Init] Failed to create table:", error);
    process.exit(1);
  }
}

/**
 * Performs a full sync from GRID API to database.
 */
async function performSync(force: boolean): Promise<void> {
  console.log("\n=== GRID Team Registry Sync ===\n");

  // Ensure table exists
  console.log("[Sync] Ensuring table schema exists...");
  await ensureTeamTableExists();

  // Check cooldown unless forced
  if (!force) {
    const lastSync = await getLastSyncTime();
    if (lastSync) {
      const ageMs = Date.now() - lastSync.getTime();
      if (ageMs < SYNC_COOLDOWN_MS) {
        const remainingMinutes = Math.round(
          (SYNC_COOLDOWN_MS - ageMs) / 1000 / 60
        );
        console.log(
          `[Sync] Last sync was ${Math.round(ageMs / 1000 / 60)} minutes ago`
        );
        console.log(
          `[Sync] Cooldown: ${remainingMinutes} minutes remaining`
        );
        console.log("[Sync] Use --force to override cooldown");
        return;
      }
    }
  }

  // Fetch from GRID
  const startTime = Date.now();
  const teams = await fetchAllTeams();

  if (teams.length === 0) {
    console.error("[Sync] No teams fetched, aborting");
    process.exit(1);
  }

  // Transform and store
  console.log("[Sync] Storing teams in database...");
  const records = transformTeams(teams);
  const { inserted, updated } = await bulkUpsertTeams(records);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log("\n=== Sync Complete ===\n");
  console.log(`Duration: ${duration} seconds`);
  console.log(`Teams processed: ${teams.length}`);
  console.log(`New teams: ${inserted}`);
  console.log(`Updated teams: ${updated}`);
  console.log("");

  // Show final status
  await showStatus();
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const showStatusOnly = args.includes("--status");
  const initOnly = args.includes("--init");
  const force = args.includes("--force");

  try {
    if (showStatusOnly) {
      await showStatus();
    } else if (initOnly) {
      await initTable();
    } else {
      await performSync(force);
    }
  } catch (error) {
    console.error("\n[Error] Sync failed:", error);
    process.exit(1);
  }
}

main();
