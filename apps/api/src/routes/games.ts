import { Hono } from "hono";
import { getGamesController, getGameIconsController } from "../controllers/games";

/**
 * Games Routes
 *
 * Endpoints for esports game metadata.
 */
const gamesRoutes = new Hono()
  .get("/", getGamesController)
  .get("/icons", getGameIconsController);

export { gamesRoutes };

