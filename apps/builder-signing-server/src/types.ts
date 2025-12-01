/**
 * Type definitions for builder signing server
 */

/**
 * Signing request payload
 */
export interface SigningRequest {
  method: string;
  path: string;
  body?: unknown;
}

/**
 * Builder header payload response
 */
export interface BuilderHeaderPayload {
  headers: Record<string, string>;
}

