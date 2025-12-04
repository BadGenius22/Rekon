import type { Context } from "hono";
import { fetchGammaTeams } from "../adapters/polymarket";

interface NormalizedTeam {
  name: string;
  shortName?: string;
  imageUrl?: string;
}

/**
 * GET /teams
 * Returns aggregated esports team metadata (name + logo URL) for CS2, LoL, Dota 2, Valorant.
 */
export async function getTeamsController(c: Context) {
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
      };
    })
    .filter((t): t is NormalizedTeam => t !== null);

  return c.json({ teams });
}
