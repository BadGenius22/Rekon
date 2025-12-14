import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getSession, createSession } from "../services/sessions";

// Temporary type until @rekon/types is updated
type UserSession = {
  sessionId: string;
  fingerprintId?: string;
  userAgent?: string;
  attribution?: {
    source: string;
  };
  createdAt: string;
  lastActiveAt: string;
};

/**
 * Session Middleware
 *
 * Manages user sessions for all requests.
 *
 * Flow:
 * 1. Checks for existing session cookie
 * 2. Creates new session if not found
 * 3. Attaches session to request context
 * 4. Refreshes session on each request
 *
 * Cookie:
 * - Name: `rekon_session_id`
 * - HttpOnly: true (prevents XSS)
 * - Secure: true (HTTPS only in production)
 * - SameSite: Lax (CSRF protection)
 */

const SESSION_COOKIE_NAME = "rekon_session_id";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

/**
 * Session middleware for Hono.
 * Creates or retrieves user session and attaches to context.
 */
export async function sessionMiddleware(c: Context, next: Next) {
  // Get session ID from cookie
  let sessionId = getCookie(c, SESSION_COOKIE_NAME);

  // Get or create session
  let session: UserSession | null = null;

  if (sessionId) {
    session = await getSession(sessionId);
  }

  // Create new session if not found or expired
  if (!session) {
    // Extract fingerprint from request (optional)
    const fingerprintId = c.req.header("X-Fingerprint-Id") || undefined; // Frontend sends this
    const userAgent = c.req.header("User-Agent") || undefined;

    // Create new session
    session = await createSession({
      fingerprintId,
      userAgent,
      attribution: {
        source: "web", // Can be enhanced to detect mobile, API, etc.
      },
    });

    sessionId = session.sessionId;
  }

  // Ensure sessionId is defined (should always be at this point)
  if (!sessionId || !session) {
    // This should never happen, but TypeScript needs this check
    throw new Error("Failed to create or retrieve session");
  }

  // Set/refresh session cookie
  setCookie(c, SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);

  // Attach session to context
  c.set("session", session);
  c.set("sessionId", sessionId);

  await next();
}

/**
 * Gets session from Hono context.
 * Use this in controllers/services to access the current session.
 */
export function getSessionFromContext(c: Context): UserSession | null {
  return c.get("session") || null;
}
