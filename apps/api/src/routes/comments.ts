import { Hono } from "hono";
import {
  getCommentsController,
  getCommentByIdController,
} from "../controllers/comments";
import { sessionMiddleware } from "../middleware/session";

/**
 * Comments Routes
 *
 * Thin proxy over Gamma comments endpoints:
 * - GET /comments?limit=&offset=            → list comments
 * - GET /comments?userAddress=0x...        → comments for a user
 * - GET /comments/:id                      → single comment
 */

const commentsRoutes = new Hono()
  .use("*", sessionMiddleware)
  .get("/", getCommentsController)
  .get("/:id", getCommentByIdController);

export { commentsRoutes };


