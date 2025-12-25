import { API_CONFIG } from "@rekon/config";
import type {
  SignalResult,
  SignalPricing,
  RecommendationResult,
  RecommendationPricing,
} from "@rekon/types";

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

// ============================================================================
// Signal API (x402 Payment)
// ============================================================================

export interface SignalStatusResponse {
  enabled: boolean;
  message: string;
}

export interface SignalPricingResponse extends SignalPricing {
  enabled: boolean;
  networkCaip2: string | null;
  description: string;
}

export interface SignalPreviewResponse extends SignalResult {
  isPreview: true;
  note: string;
}

export interface X402PaymentRequired {
  x402Version: number;
  error: string;
  resource: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepts: Array<{
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
    extra?: Record<string, unknown>;
  }>;
}

/**
 * Get signal system status (free endpoint)
 */
export async function getSignalStatus(): Promise<SignalStatusResponse> {
  return apiGet<SignalStatusResponse>("/signal/status");
}

/**
 * Get signal pricing info (free endpoint)
 */
export async function getSignalPricing(): Promise<SignalPricingResponse> {
  return apiGet<SignalPricingResponse>("/signal/pricing");
}

/**
 * Get signal preview without LLM explanation (free endpoint)
 */
export async function getSignalPreview(
  marketId: string
): Promise<SignalPreviewResponse> {
  return apiGet<SignalPreviewResponse>(`/signal/market/${marketId}/preview`);
}

/**
 * Get full signal with LLM explanation (paid endpoint)
 *
 * When x402 is enabled, this will return 402 Payment Required on first request.
 * The response includes payment requirements in the X-PAYMENT-REQUIRED header.
 *
 * @param marketId - Market ID to get signal for
 * @param paymentToken - Optional x402 payment token from wallet
 * @returns Signal result or payment requirements
 */
export async function getSignal(
  marketId: string,
  paymentToken?: string
): Promise<SignalResult | { paymentRequired: true; requirements: X402PaymentRequired }> {
  const headers: Record<string, string> = {};

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await apiFetch(`/signal/market/${marketId}`, {
    method: "GET",
    headers,
  });

  // Handle 402 Payment Required
  if (response.status === 402) {
    const paymentRequiredHeader = response.headers.get("X-PAYMENT-REQUIRED");
    if (paymentRequiredHeader) {
      const requirements = JSON.parse(
        atob(paymentRequiredHeader)
      ) as X402PaymentRequired;
      return { paymentRequired: true, requirements };
    }
    throw new Error("Payment required but no requirements provided");
  }

  if (!response.ok) {
    throw new Error(
      `Signal API failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// ============================================================================
// Recommendation API (x402 Payment)
// ============================================================================

export interface RecommendationStatusResponse {
  enabled: boolean;
  message: string;
  supportedGames: string[];
  features: {
    historicalAnalysis: boolean;
    liveMatchData: boolean;
    llmExplanation: boolean;
    headToHead: boolean;
    teamComparison: boolean;
  };
  dataSource: string;
}

export interface RecommendationPricingResponse extends RecommendationPricing {
  enabled: boolean;
  networkCaip2: string | null;
  description: string;
  features: string[];
}

export interface RecommendationPreviewResponse extends RecommendationResult {
  isPreview: true;
}

export interface RecommendationAvailabilityResponse {
  available: boolean;
  reason?: string;
  game?: string;
}

export interface RecommendationAccessResponse {
  hasAccess: boolean;
  expiresAt?: string;
  paidAt?: string;
  marketEndDate?: string;
  marketTitle?: string;
}

/**
 * Get recommendation system status (free endpoint)
 */
export async function getRecommendationStatus(): Promise<RecommendationStatusResponse> {
  return apiGet<RecommendationStatusResponse>("/recommendation/status");
}

/**
 * Get recommendation pricing info (free endpoint)
 */
export async function getRecommendationPricing(): Promise<RecommendationPricingResponse> {
  return apiGet<RecommendationPricingResponse>("/recommendation/pricing");
}

/**
 * Check if recommendation is available for a market (free endpoint)
 */
export async function getRecommendationAvailability(
  marketId: string
): Promise<RecommendationAvailabilityResponse> {
  return apiGet<RecommendationAvailabilityResponse>(
    `/recommendation/market/${marketId}/available`
  );
}

/**
 * Check if user has premium access for a market (free endpoint)
 *
 * Premium access is granted after payment and persists until market ends.
 * This allows users to refresh the page without repaying.
 *
 * @param marketId - Market ID to check access for
 * @param walletAddress - User's wallet address
 * @returns Access status with expiry info
 */
export async function getRecommendationAccess(
  marketId: string,
  walletAddress: string
): Promise<RecommendationAccessResponse> {
  return apiGet<RecommendationAccessResponse>(
    `/recommendation/market/${marketId}/access?wallet=${encodeURIComponent(walletAddress)}`
  );
}

/**
 * Get recommendation preview without LLM explanation (free endpoint)
 */
export async function getRecommendationPreview(
  marketId: string
): Promise<RecommendationPreviewResponse> {
  return apiGet<RecommendationPreviewResponse>(
    `/recommendation/market/${marketId}/preview`
  );
}

/**
 * Get full recommendation with LLM explanation (paid endpoint)
 *
 * When x402 is enabled, this will return 402 Payment Required on first request.
 * The response includes payment requirements in the X-PAYMENT-REQUIRED header.
 *
 * @param marketId - Market ID to get recommendation for
 * @param paymentToken - Optional x402 payment token from wallet
 * @returns Recommendation result or payment requirements
 */
export async function getRecommendation(
  marketId: string,
  paymentToken?: string
): Promise<
  | RecommendationResult
  | { paymentRequired: true; requirements: X402PaymentRequired }
> {
  const headers: Record<string, string> = {};

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await apiFetch(`/recommendation/market/${marketId}`, {
    method: "GET",
    headers,
  });

  // Handle 402 Payment Required
  if (response.status === 402) {
    const paymentRequiredHeader = response.headers.get("X-PAYMENT-REQUIRED");
    if (paymentRequiredHeader) {
      const requirements = JSON.parse(
        atob(paymentRequiredHeader)
      ) as X402PaymentRequired;
      return { paymentRequired: true, requirements };
    }
    throw new Error("Payment required but no requirements provided");
  }

  if (!response.ok) {
    throw new Error(
      `Recommendation API failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
