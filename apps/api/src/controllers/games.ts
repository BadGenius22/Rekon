import type { Context } from "hono";
import { getEsportsGames, getGameIcons } from "../services/games";

/**
 * Games Controllers
 *
 * Handle request/response logic for game metadata endpoints.
 */

/**
 * GET /api/games
 * Get all supported esports games with metadata.
 */
export async function getGamesController(c: Context) {
  const games = await getEsportsGames();
  return c.json(games);
}

/**
 * GET /api/games/icons
 * Get icon URLs for all supported games.
 * Returns a map of gameId -> imageUrl.
 */
export async function getGameIconsController(c: Context) {
  const icons = await getGameIcons();
  return c.json(icons);
}
