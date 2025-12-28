import type { Context } from "hono";
import { searchTeamsByNameWithLogo } from "../db/teams.js";
import { fetchGammaTeamByName } from "../adapters/polymarket/index.js";

interface NormalizedTeam {
  name: string;
  shortName?: string;
  imageUrl?: string;
  league?: string;
  color?: string;
}

/**
 * Maps league parameter to game field in database.
 * League can be: csgo, cs2, lol, dota2, valorant
 */
function mapLeagueToGame(league?: string): string | null {
  if (!league) return null;

  const leagueLower = league.toLowerCase();

  // Map common league names to game values
  if (
    leagueLower === "csgo" ||
    leagueLower === "cs2" ||
    leagueLower === "counter-strike"
  ) {
    return "cs2";
  }
  if (leagueLower === "lol" || leagueLower === "league of legends") {
    return "lol";
  }
  if (
    leagueLower === "dota2" ||
    leagueLower === "dota 2" ||
    leagueLower === "dota"
  ) {
    return "dota2";
  }
  if (leagueLower === "valorant" || leagueLower === "vct") {
    return "valorant";
  }

  // Return as-is if it's already a valid game value
  if (["cs2", "lol", "dota2", "valorant"].includes(leagueLower)) {
    return leagueLower;
  }

  return null;
}

/**
 * GET /teams
 * Returns aggregated esports team metadata (name + logo URL) from grid_teams database.
 *
 * Query params:
 * - name: Optional team name to search for
 * - league: Optional league filter (csgo, cs2, lol, dota2, valorant)
 */
export async function getTeamsController(c: Context) {
  const name = c.req.query("name");
  const league = c.req.query("league");
  const game = mapLeagueToGame(league);

  // If name is provided, search for specific team
  if (name) {
    // Check both sources in parallel for better performance
    const [gridTeams, polymarketTeam] = await Promise.all([
      searchTeamsByNameWithLogo(name, game, 1),
      fetchGammaTeamByName(name, league || undefined),
    ]);

    const gridTeam = gridTeams.length > 0 ? gridTeams[0] : null;
    const polymarketLogo =
      polymarketTeam?.imageUrl || polymarketTeam?.logo || null;

    // Strategy: Prefer Polymarket logo when available (more accurate for some teams)
    // Fall back to GRID logo if Polymarket doesn't have one
    const preferredLogo = polymarketLogo || gridTeam?.logoUrl || null;

    if (gridTeam) {
      // GRID team exists - use GRID name (more canonical), but prefer Polymarket logo
      const normalizedTeam: NormalizedTeam = {
        name: gridTeam.name,
        imageUrl: preferredLogo || undefined,
        league: gridTeam.game || league || undefined,
        color: gridTeam.colorPrimary || polymarketTeam?.color || undefined,
      };
      return c.json({ teams: [normalizedTeam] });
    }

    // GRID doesn't have the team - use Polymarket data
    if (polymarketTeam) {
      const normalizedTeam: NormalizedTeam = {
        name: polymarketTeam.name || polymarketTeam.abbreviation || name,
        shortName: polymarketTeam.abbreviation,
        imageUrl: polymarketLogo || undefined,
        league: polymarketTeam.league || league || undefined,
        color: polymarketTeam.color,
      };
      return c.json({ teams: [normalizedTeam] });
    }

    // No team found in either source
    return c.json({ teams: [] });
  }

  // If no name provided, return empty (we don't want to return all teams)
  // This matches the previous behavior when name was required
  return c.json({ teams: [] });
}
