export const runtime = "nodejs";

import { handle } from "hono/vercel";
import type { Hono } from "hono";
import app from "../dist/index.js";

const handler = handle(app as Hono);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
