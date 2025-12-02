import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock config to control URLs and marketSource
vi.mock("@rekon/config", () => ({
  POLYMARKET_CONFIG: {
    builderApiUrl: "https://api.builder.polymarket.test",
    gammaApiUrl: "https://gamma-api.polymarket.test",
    clobApiUrl: "https://clob.polymarket.test",
    apiUrl: "https://clob.polymarket.test",
    offline: false,
    marketSource: "gamma" as "gamma" | "builder",
  },
}));

// Mock headers so we don't depend on their implementation details
vi.mock("./headers", () => ({
  getBuilderApiHeaders: () => ({
    "Content-Type": "application/json",
    Authorization: "Bearer test-key",
  }),
  getClobApiHeaders: () => ({ "Content-Type": "application/json" }),
  getDataApiHeaders: () => ({ "Content-Type": "application/json" }),
}));

// Mock sentry tracking to a no-op
vi.mock("../../utils/sentry", () => ({
  trackPolymarketApiFailure: vi.fn(),
}));

// Import after mocks
import { POLYMARKET_CONFIG } from "@rekon/config";
import { fetchPolymarketMarkets } from "./client";

const originalFetch = global.fetch;

beforeEach(() => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => [],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = fetchMock;
});

afterEach(() => {
  global.fetch = originalFetch!;
  vi.clearAllMocks();
});

describe("polymarket/client - fetchPolymarketMarkets", () => {
  it("uses Gamma base URL without builder headers when marketSource=gamma", async () => {
    await fetchPolymarketMarkets({ limit: 10, offset: 5, closed: false });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://gamma-api.polymarket.test/markets?closed=false&limit=10&offset=5"
    );
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
  });
});
