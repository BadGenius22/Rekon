/**
 * Vercel Serverless Function Entry Point (Build Output API v3)
 *
 * Pre-bundled by tsup with all dependencies.
 * Uses @hono/node-server to handle Node.js request/response.
 */

import { getRequestListener } from "@hono/node-server";
import app from "../src/index.js";

export default getRequestListener(app.fetch.bind(app));
