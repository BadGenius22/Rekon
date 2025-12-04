import { Hono } from "hono";
import { getActivityHandler } from "../controllers/activity";

export const activityRoutes = new Hono();

activityRoutes.get("/", getActivityHandler);

