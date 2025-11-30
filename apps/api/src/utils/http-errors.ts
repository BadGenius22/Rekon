import { HTTPException } from "hono/http-exception";

/**
 * HTTP Error Helpers
 *
 * Provides consistent error handling across all controllers.
 * Use these helpers instead of manually creating HTTPException or returning error responses.
 */

/**
 * Returns a 400 Bad Request error.
 */
export function BadRequest(message: string): HTTPException {
  return new HTTPException(400, { message });
}

/**
 * Returns a 401 Unauthorized error.
 */
export function Unauthorized(message: string = "Unauthorized"): HTTPException {
  return new HTTPException(401, { message });
}

/**
 * Returns a 403 Forbidden error.
 */
export function Forbidden(message: string = "Forbidden"): HTTPException {
  return new HTTPException(403, { message });
}

/**
 * Returns a 404 Not Found error.
 */
export function NotFound(message: string): HTTPException {
  return new HTTPException(404, { message });
}

/**
 * Returns a 409 Conflict error.
 */
export function Conflict(message: string): HTTPException {
  return new HTTPException(409, { message });
}

/**
 * Returns a 422 Unprocessable Entity error.
 */
export function UnprocessableEntity(message: string): HTTPException {
  return new HTTPException(422, { message });
}

/**
 * Returns a 429 Too Many Requests error.
 */
export function TooManyRequests(
  message: string = "Too many requests"
): HTTPException {
  return new HTTPException(429, { message });
}

/**
 * Returns a 500 Internal Server Error.
 * Use sparingly - prefer letting errors bubble to global handler.
 */
export function InternalServerError(
  message: string = "Internal server error"
): HTTPException {
  return new HTTPException(500, { message });
}
