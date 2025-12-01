import express, { Request, Response } from "express";
import cors from "cors";
import { buildHmacSignature } from "@polymarket/builder-signing-sdk";
import type { SigningRequest, BuilderHeaderPayload } from "./types.js";

/**
 * Express app configuration for builder signing server
 */

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Optional authentication middleware
const authToken = process.env.AUTH_TOKEN;
if (authToken) {
  app.use("/sign", (req: Request, res: Response, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token !== authToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing authorization token",
      });
    }

    next();
  });
}

// Validate environment variables
const requiredEnvVars = [
  "POLY_BUILDER_API_KEY",
  "POLY_BUILDER_SECRET",
  "POLY_BUILDER_PASSPHRASE",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}. Please set it in your .env file.`
    );
  }
}

// Builder credentials (loaded from environment)
const builderCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

/**
 * Health check endpoint
 * GET /
 */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "builder-signing-server",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Sign endpoint
 * POST /sign
 * 
 * Accepts signing requests with path, method, and body.
 * Returns a BuilderHeaderPayload with builder attribution headers.
 */
app.post("/sign", async (req: Request, res: Response) => {
  try {
    const signingRequest: SigningRequest = req.body;

    // Validate request
    if (!signingRequest.method || !signingRequest.path) {
      return res.status(400).json({
        error: "Invalid request",
        message: "Request must include 'method' and 'path' fields",
      });
    }

    // Generate timestamp
    const timestamp = Math.floor(Date.now() / 1000);

    // Serialize body if present
    const bodyString = signingRequest.body
      ? JSON.stringify(signingRequest.body)
      : "";

    // Build HMAC signature for builder attribution
    const signature = buildHmacSignature(
      builderCreds.secret,
      timestamp,
      signingRequest.method,
      signingRequest.path,
      bodyString
    );

    // Build builder attribution headers
    const headers: Record<string, string> = {
      POLY_BUILDER_API_KEY: builderCreds.key,
      POLY_BUILDER_TIMESTAMP: String(timestamp),
      POLY_BUILDER_PASSPHRASE: builderCreds.passphrase,
      POLY_BUILDER_SIGNATURE: signature,
    };

    const payload: BuilderHeaderPayload = {
      headers,
    };

    res.json(payload);
  } catch (error) {
    console.error("Error generating builder headers:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default app;

