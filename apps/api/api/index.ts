/**
 * Vercel Serverless Function Handler (Build Output API v3)
 *
 * Uses @hono/node-server for Node.js runtime compatibility.
 * Build Output API v3 passes Node.js IncomingMessage/ServerResponse,
 * not Web Request objects, so we need the node-server adapter.
 */

import { getRequestListener } from "@hono/node-server";
import app from "../src/index.js";

const handler = getRequestListener(app.fetch);

export default handler;
