/**
 * GRID Team Registry (Neon / Postgres)
 *
 * This module provides persistent storage for GRID team data to avoid:
 * 1. Repeated API pagination through 5000+ teams
 * 2. Rate limit issues from frequent team lookups
 * 3. GraphQL cursor/pagination complexity
 *
 * Strategy:
 * - Pre-load all teams from GRID API once (via sync script)
 * - Store in Postgres with fuzzy search support
 * - Query locally instead of hitting GRID API
 * - Refresh periodically (daily/weekly)
 *
 * Table Schema (run in Neon console):
 * ```sql
 * CREATE TABLE IF NOT EXISTS grid_teams (
 *   id            BIGSERIAL PRIMARY KEY,
 *   grid_id       TEXT UNIQUE NOT NULL,
 *   name          TEXT NOT NULL,
 *   name_lower    TEXT NOT NULL,  -- lowercase for case-insensitive search
 *   color_primary TEXT,
 *   color_secondary TEXT,
 *   logo_url      TEXT,
 *   aliases       TEXT[],         -- array of known aliases
 *   game          TEXT,           -- cs2, lol, dota2, valorant
 *   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- Indexes for fast search
 * CREATE INDEX IF NOT EXISTS grid_teams_name_lower_idx ON grid_teams (name_lower);
 * CREATE INDEX IF NOT EXISTS grid_teams_name_trigram_idx ON grid_teams USING gin (name_lower gin_trgm_ops);
 * CREATE INDEX IF NOT EXISTS grid_teams_game_idx ON grid_teams (game);
 *
 * -- Enable trigram extension for fuzzy search (run once)
 * CREATE EXTENSION IF NOT EXISTS pg_trgm;
 * ```
 */

import { getSql } from "./client.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Shape of the grid_teams table in Postgres.
 */
export interface TeamRecord {
  id: number;
  gridId: string;
  name: string;
  nameLower: string;
  colorPrimary: string | null;
  colorSecondary: string | null;
  logoUrl: string | null;
  aliases: string[];
  game: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamRecordInput {
  gridId: string;
  name: string;
  colorPrimary?: string | null;
  colorSecondary?: string | null;
  logoUrl?: string | null;
  aliases?: string[];
  game?: string | null;
}

export interface TeamSearchResult {
  gridId: string;
  name: string;
  similarity: number;
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Upserts a team record (insert or update on conflict).
 * Used by the sync script to bulk-load teams.
 */
export async function upsertTeamRecord(
  input: CreateTeamRecordInput
): Promise<void> {
  const sql = getSql();
  const nameLower = input.name.toLowerCase().trim();

  await sql`
    INSERT INTO grid_teams (
      grid_id,
      name,
      name_lower,
      color_primary,
      color_secondary,
      logo_url,
      aliases,
      game
    )
    VALUES (
      ${input.gridId},
      ${input.name},
      ${nameLower},
      ${input.colorPrimary ?? null},
      ${input.colorSecondary ?? null},
      ${input.logoUrl ?? null},
      ${input.aliases ?? []},
      ${input.game ?? null}
    )
    ON CONFLICT (grid_id) DO UPDATE SET
      name = EXCLUDED.name,
      name_lower = EXCLUDED.name_lower,
      color_primary = EXCLUDED.color_primary,
      color_secondary = EXCLUDED.color_secondary,
      logo_url = EXCLUDED.logo_url,
      aliases = EXCLUDED.aliases,
      game = COALESCE(EXCLUDED.game, grid_teams.game),
      updated_at = NOW()
  `;
}

/**
 * Bulk upserts multiple team records using UNNEST for batch INSERT.
 * 500 teams per query - ~16x faster than individual inserts.
 */
export async function bulkUpsertTeams(
  teams: CreateTeamRecordInput[],
  batchSize = 500
): Promise<{ inserted: number; updated: number }> {
  const sql = getSql();

  // Get existing count for stats
  const beforeCount = await getTeamCount();

  // Process in batches
  for (let i = 0; i < teams.length; i += batchSize) {
    const batch = teams.slice(i, i + batchSize);

    // Prepare arrays for UNNEST batch insert
    const gridIds = batch.map((t) => t.gridId);
    const names = batch.map((t) => t.name);
    const namesLower = batch.map((t) => t.name.toLowerCase().trim());
    const colorPrimaries = batch.map((t) => t.colorPrimary ?? null);
    const colorSecondaries = batch.map((t) => t.colorSecondary ?? null);
    const logoUrls = batch.map((t) => t.logoUrl ?? null);

    // Single batch INSERT using UNNEST - much faster than individual inserts
    await sql`
      INSERT INTO grid_teams (
        grid_id, name, name_lower, color_primary, color_secondary, logo_url, aliases, game
      )
      SELECT
        unnest(${gridIds}::text[]),
        unnest(${names}::text[]),
        unnest(${namesLower}::text[]),
        unnest(${colorPrimaries}::text[]),
        unnest(${colorSecondaries}::text[]),
        unnest(${logoUrls}::text[]),
        '{}'::text[],
        NULL::text
      ON CONFLICT (grid_id) DO UPDATE SET
        name = EXCLUDED.name,
        name_lower = EXCLUDED.name_lower,
        color_primary = EXCLUDED.color_primary,
        color_secondary = EXCLUDED.color_secondary,
        logo_url = EXCLUDED.logo_url,
        updated_at = NOW()
    `;

    const processed = Math.min(i + batchSize, teams.length);
    console.log(`[Team Sync] Processed ${processed}/${teams.length} teams`);
  }

  // Get final count
  const afterCount = await getTeamCount();
  const inserted = afterCount - beforeCount;
  const updated = teams.length - inserted;

  return { inserted: Math.max(0, inserted), updated: Math.max(0, updated) };
}

/**
 * Searches for teams by name using trigram similarity.
 * Returns teams ordered by similarity score (best match first).
 *
 * Requires pg_trgm extension to be enabled.
 */
export async function searchTeamsByName(
  query: string,
  limit = 5
): Promise<TeamSearchResult[]> {
  const sql = getSql();
  const queryLower = query.toLowerCase().trim();

  // First try exact match
  const exactMatch = (await sql`
    SELECT grid_id as "gridId", name, 1.0 as similarity
    FROM grid_teams
    WHERE name_lower = ${queryLower}
    LIMIT 1
  `) as TeamSearchResult[];

  if (exactMatch.length > 0) {
    return exactMatch;
  }

  // Then try trigram similarity search
  // Note: Requires pg_trgm extension
  const results = (await sql`
    SELECT
      grid_id as "gridId",
      name,
      similarity(name_lower, ${queryLower}) as similarity
    FROM grid_teams
    WHERE similarity(name_lower, ${queryLower}) > 0.2
       OR name_lower LIKE ${`%${queryLower}%`}
    ORDER BY similarity(name_lower, ${queryLower}) DESC, name
    LIMIT ${limit}
  `) as TeamSearchResult[];

  return results;
}

/**
 * Fallback search using LIKE patterns when pg_trgm is not available.
 */
export async function searchTeamsByNameBasic(
  query: string,
  limit = 5
): Promise<TeamSearchResult[]> {
  const sql = getSql();
  const queryLower = query.toLowerCase().trim();

  // Exact match
  const exactMatch = (await sql`
    SELECT grid_id as "gridId", name, 1.0 as similarity
    FROM grid_teams
    WHERE name_lower = ${queryLower}
    LIMIT 1
  `) as TeamSearchResult[];

  if (exactMatch.length > 0) {
    return exactMatch;
  }

  // Starts with
  const startsWithMatch = (await sql`
    SELECT grid_id as "gridId", name, 0.8 as similarity
    FROM grid_teams
    WHERE name_lower LIKE ${`${queryLower}%`}
    ORDER BY LENGTH(name), name
    LIMIT ${limit}
  `) as TeamSearchResult[];

  if (startsWithMatch.length > 0) {
    return startsWithMatch;
  }

  // Contains
  const containsMatch = (await sql`
    SELECT grid_id as "gridId", name, 0.5 as similarity
    FROM grid_teams
    WHERE name_lower LIKE ${`%${queryLower}%`}
    ORDER BY LENGTH(name), name
    LIMIT ${limit}
  `) as TeamSearchResult[];

  return containsMatch;
}

/**
 * Finds a team by its GRID ID.
 */
export async function findTeamByGridId(
  gridId: string
): Promise<TeamRecord | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      grid_id as "gridId",
      name,
      name_lower as "nameLower",
      color_primary as "colorPrimary",
      color_secondary as "colorSecondary",
      logo_url as "logoUrl",
      aliases,
      game,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM grid_teams
    WHERE grid_id = ${gridId}
    LIMIT 1
  `) as TeamRecord[];

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Searches for teams by name and returns full team records with logo_url.
 * Optionally filters by game.
 */
export async function searchTeamsByNameWithLogo(
  query: string,
  game?: string | null,
  limit = 5
): Promise<TeamRecord[]> {
  const sql = getSql();
  const queryLower = query.toLowerCase().trim();

  // Build query with optional game filter
  if (game) {
    // Exact match with game filter
    const exactMatch = (await sql`
      SELECT
        id,
        grid_id as "gridId",
        name,
        name_lower as "nameLower",
        color_primary as "colorPrimary",
        color_secondary as "colorSecondary",
        logo_url as "logoUrl",
        aliases,
        game,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM grid_teams
      WHERE name_lower = ${queryLower}
        AND (game = ${game} OR game IS NULL)
      LIMIT 1
    `) as TeamRecord[];

    if (exactMatch.length > 0) {
      return exactMatch;
    }

    // Starts with match with game filter
    const startsWithMatch = (await sql`
      SELECT
        id,
        grid_id as "gridId",
        name,
        name_lower as "nameLower",
        color_primary as "colorPrimary",
        color_secondary as "colorSecondary",
        logo_url as "logoUrl",
        aliases,
        game,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM grid_teams
      WHERE name_lower LIKE ${`${queryLower}%`}
        AND (game = ${game} OR game IS NULL)
      ORDER BY LENGTH(name), name
      LIMIT ${limit}
    `) as TeamRecord[];

    if (startsWithMatch.length > 0) {
      return startsWithMatch;
    }

    // Contains match with game filter
    const containsMatch = (await sql`
      SELECT
        id,
        grid_id as "gridId",
        name,
        name_lower as "nameLower",
        color_primary as "colorPrimary",
        color_secondary as "colorSecondary",
        logo_url as "logoUrl",
        aliases,
        game,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM grid_teams
      WHERE name_lower LIKE ${`%${queryLower}%`}
        AND (game = ${game} OR game IS NULL)
      ORDER BY LENGTH(name), name
      LIMIT ${limit}
    `) as TeamRecord[];

    return containsMatch;
  } else {
    // No game filter - same logic but without game condition
    const exactMatch = (await sql`
      SELECT
        id,
        grid_id as "gridId",
        name,
        name_lower as "nameLower",
        color_primary as "colorPrimary",
        color_secondary as "colorSecondary",
        logo_url as "logoUrl",
        aliases,
        game,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM grid_teams
      WHERE name_lower = ${queryLower}
      LIMIT 1
    `) as TeamRecord[];

    if (exactMatch.length > 0) {
      return exactMatch;
    }

    const startsWithMatch = (await sql`
      SELECT
        id,
        grid_id as "gridId",
        name,
        name_lower as "nameLower",
        color_primary as "colorPrimary",
        color_secondary as "colorSecondary",
        logo_url as "logoUrl",
        aliases,
        game,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM grid_teams
      WHERE name_lower LIKE ${`${queryLower}%`}
      ORDER BY LENGTH(name), name
      LIMIT ${limit}
    `) as TeamRecord[];

    if (startsWithMatch.length > 0) {
      return startsWithMatch;
    }

    const containsMatch = (await sql`
      SELECT
        id,
        grid_id as "gridId",
        name,
        name_lower as "nameLower",
        color_primary as "colorPrimary",
        color_secondary as "colorSecondary",
        logo_url as "logoUrl",
        aliases,
        game,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM grid_teams
      WHERE name_lower LIKE ${`%${queryLower}%`}
      ORDER BY LENGTH(name), name
      LIMIT ${limit}
    `) as TeamRecord[];

    return containsMatch;
  }
}

/**
 * Gets the total count of teams in the registry.
 */
export async function getTeamCount(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT COUNT(*) as count FROM grid_teams
  `) as { count: string }[];

  return parseInt(rows[0]?.count || "0", 10);
}

/**
 * Gets the last sync timestamp.
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT MAX(updated_at) as last_sync FROM grid_teams
  `) as { last_sync: string | null }[];

  const lastSync = rows[0]?.last_sync;
  return lastSync ? new Date(lastSync) : null;
}

/**
 * Clears all teams from the registry.
 * Use with caution - mainly for development/testing.
 */
export async function clearTeamRegistry(): Promise<void> {
  const sql = getSql();
  await sql`TRUNCATE TABLE grid_teams`;
}

/**
 * Creates the grid_teams table if it doesn't exist.
 * Call this at startup or in migrations.
 */
export async function ensureTeamTableExists(): Promise<void> {
  const sql = getSql();

  // Create extension (may require superuser)
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  } catch (error) {
    console.warn(
      "[Team Registry] pg_trgm extension not available, using basic search"
    );
  }

  // Create table
  await sql`
    CREATE TABLE IF NOT EXISTS grid_teams (
      id              BIGSERIAL PRIMARY KEY,
      grid_id         TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      name_lower      TEXT NOT NULL,
      color_primary   TEXT,
      color_secondary TEXT,
      logo_url        TEXT,
      aliases         TEXT[],
      game            TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Create indexes
  await sql`
    CREATE INDEX IF NOT EXISTS grid_teams_name_lower_idx
    ON grid_teams (name_lower)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS grid_teams_game_idx
    ON grid_teams (game)
  `;

  // Try to create trigram index (may fail if extension not available)
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS grid_teams_name_trigram_idx
      ON grid_teams USING gin (name_lower gin_trgm_ops)
    `;
  } catch {
    console.warn(
      "[Team Registry] Trigram index not created (pg_trgm not available)"
    );
  }
}
