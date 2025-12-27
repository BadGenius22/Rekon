import { Hono } from "hono";
import { getActivityHandler } from "../controllers/activity.js";

export const activityRoutes = new Hono();

activityRoutes.get("/", getActivityHandler);

