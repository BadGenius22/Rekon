import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POLYMARKET_CONFIG } from "@rekon/config";
import { getDataApiHeaders } from "./headers";
import { trackPolymarketApiFailure } from "../../utils/sentry";
import {
  fetchTotalMarketsTraded,
  fetchOpenInterest,
  fetchLiveVolume,
} from "./misc";

// Mock global fetch
const originalFetch = globalThis.fetch;

vi.mock("../../utils/sentry", () => ({
  trackPolymarketApiFailure: vi.fn(),
}));

vi.mock("./headers", () => ({
  getDataApiHeaders: vi.fn(() => ({
    "Content-Type": "application/json",
    Authorization: "Bearer test-key",
  })),
}));

describe("adapters/polymarket Data-API clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetchTotalMarketsTraded calls /traded with correct query and headers", async () => {
    const address = "0x123";
    const mockResponse = {
      user: address,
      traded: 7,
    };

    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockResponse,
      }
    );

    const result = await fetchTotalMarketsTraded(address);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const expectedUrl = `${
      POLYMARKET_CONFIG.dataApiUrl
    }/traded?user=${encodeURIComponent(address)}`;
    expect(globalThis.fetch as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expectedUrl,
      {
        headers: getDataApiHeaders(),
      }
    );

    expect(result).toEqual(mockResponse);
  });

  it("fetchTotalMarketsTraded tracks failure and throws on non-2xx response", async () => {
    const address = "0xdead";

    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
      }
    );

    await expect(fetchTotalMarketsTraded(address)).rejects.toThrow(
      "Polymarket Data-API error: 500 Internal Server Error"
    );

    const expectedUrl = `${
      POLYMARKET_CONFIG.dataApiUrl
    }/traded?user=${encodeURIComponent(address)}`;

    expect(trackPolymarketApiFailure).toHaveBeenCalledWith(
      expectedUrl,
      500,
      expect.any(Error)
    );
  });

  it("fetchOpenInterest calls /oi with correct headers and returns JSON", async () => {
    const mockResponse = { oi: 12345 };

    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockResponse,
      }
    );

    const result = await fetchOpenInterest();

    const expectedUrl = `${POLYMARKET_CONFIG.dataApiUrl}/oi`;
    expect(globalThis.fetch).toHaveBeenCalledWith(expectedUrl, {
      headers: getDataApiHeaders(),
    });
    expect(result).toEqual(mockResponse);
  });

  it("fetchOpenInterest tracks failure and throws on non-2xx response", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => ({}),
      }
    );

    await expect(fetchOpenInterest()).rejects.toThrow(
      "Polymarket Data-API error: 502 Bad Gateway"
    );

    const expectedUrl = `${POLYMARKET_CONFIG.dataApiUrl}/oi`;
    expect(trackPolymarketApiFailure).toHaveBeenCalledWith(
      expectedUrl,
      502,
      expect.any(Error)
    );
  });

  it("fetchLiveVolume calls /live-volume with correct headers and returns JSON", async () => {
    const mockResponse = { volume: 9999 };

    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockResponse,
      }
    );

    const result = await fetchLiveVolume();

    const expectedUrl = `${POLYMARKET_CONFIG.dataApiUrl}/live-volume`;
    expect(globalThis.fetch).toHaveBeenCalledWith(expectedUrl, {
      headers: getDataApiHeaders(),
    });
    expect(result).toEqual(mockResponse);
  });

  it("fetchLiveVolume tracks failure and throws on non-2xx response", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({}),
      }
    );

    await expect(fetchLiveVolume()).rejects.toThrow(
      "Polymarket Data-API error: 503 Service Unavailable"
    );

    const expectedUrl = `${POLYMARKET_CONFIG.dataApiUrl}/live-volume`;
    expect(trackPolymarketApiFailure).toHaveBeenCalledWith(
      expectedUrl,
      503,
      expect.any(Error)
    );
  });
});
