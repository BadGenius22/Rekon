import { API_CONFIG } from "@rekon/config";

/**
 * API Client for Rekon Frontend
 *
 * Provides a centralized fetch wrapper that:
 * - Automatically prepends the API base URL
 * - Adds demo mode header when active (reads from localStorage)
 * - Handles common error cases
 *
 * Best Practice: Single source of truth for API configuration
 */

const DEMO_MODE_KEY = "rekon_demo_mode";

/**
 * Check if demo mode is active from localStorage
 * Safe to call on server-side (returns false)
 */
export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

/**
 * Get headers for API requests, including demo mode header if active
 */
export function getApiHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add demo mode header if active
  if (isDemoModeActive()) {
    headers["x-demo-mode"] = "true";
  }

  // Merge additional headers
  if (additionalHeaders) {
    if (additionalHeaders instanceof Headers) {
      additionalHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(additionalHeaders)) {
      additionalHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, additionalHeaders);
    }
  }

  return headers;
}

/**
 * API fetch wrapper with demo mode support
 *
 * @param path - API path (e.g., "/markets" or "/markets/123")
 * @param options - Fetch options (method, body, etc.)
 * @returns Fetch Response
 *
 * @example
 * const response = await apiFetch("/markets?category=esports");
 * const data = await response.json();
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `${API_CONFIG.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = getApiHeaders(options.headers);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * GET request helper
 */
export async function apiGet<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `API GET ${path} failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `API POST ${path} failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Build API URL with demo mode query param (for SSR/ISR requests)
 *
 * Server-side requests can't access localStorage, so we provide this
 * helper to build URLs that include the demo mode state as a query param.
 *
 * @param path - API path
 * @param isDemoMode - Whether demo mode is active (from context/props)
 * @returns Full API URL with optional demo_mode query param
 */
export function buildApiUrl(path: string, isDemoMode?: boolean): string {
  const baseUrl = path.startsWith("http")
    ? path
    : `${API_CONFIG.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  if (isDemoMode) {
    const url = new URL(baseUrl);
    url.searchParams.set("demo_mode", "true");
    return url.toString();
  }

  return baseUrl;
}
