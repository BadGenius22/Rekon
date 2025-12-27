import type { Context } from "hono";
import { z } from "zod";
import { fetchGammaTeams, fetchGammaTeamByName } from "../adapters/polymarket/index.js";

interface NormalizedTeam {
  name: string;
  shortName?: string;
  imageUrl?: string;
  league?: string;
  color?: string;
}

/**
 * GET /teams
 * Returns aggregated esports team metadata (name + logo URL) for CS2, LoL, Dota 2, Valorant.
 *
 * Query params:
 * - name: Optional team name to search for
 * - league: Optional league filter (csgo, lol, dota2, valorant)
 */
export async function getTeamsController(c: Context) {
  const name = c.req.query("name");
  const league = c.req.query("league");

  // If name is provided, search for specific team
  if (name) {
    const rawTeam = await fetchGammaTeamByName(name, league || undefined);

    if (!rawTeam) {
      return c.json({ teams: [] });
    }

    const team: NormalizedTeam = {
      name: rawTeam.name || rawTeam.abbreviation || "",
      shortName: rawTeam.abbreviation,
      imageUrl: rawTeam.imageUrl || rawTeam.logo,
      league: rawTeam.league,
      color: rawTeam.color,
    };

    return c.json({ teams: [team] });
  }

  // Otherwise, return all teams
  const rawTeams = await fetchGammaTeams();

  const teams: NormalizedTeam[] = rawTeams
    .map<NormalizedTeam | null>((team) => {
      const name =
        team.name?.trim() ||
        team.abbreviation?.trim() ||
        team.alias?.toString().trim() ||
        "";
      if (!name) {
        return null;
      }

      const imageUrl = team.imageUrl || team.logo || undefined;
      const shortName = team.abbreviation || undefined;

      return {
        name,
        shortName,
        imageUrl,
        league: team.league,
        color: team.color,
      };
    })
    .filter((t): t is NormalizedTeam => t !== null);

  return c.json({ teams });
}
