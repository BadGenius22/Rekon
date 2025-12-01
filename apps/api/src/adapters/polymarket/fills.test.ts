import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("./clob-client", () => ({
  getClobClient: vi.fn(),
}));

vi.mock("@rekon/config", () => ({
  POLYMARKET_CONFIG: {
    clobApiUrl: "https://clob.polymarket.com",
  },
}));

vi.mock("../../utils/sentry", () => ({
  trackPolymarketApiFailure: vi.fn(),
}));

import { fetchUserFills } from "./fills";
import { getClobClient } from "./clob-client";

// Access internal mapper via module import + type cast
const getClobClientMock = getClobClient as unknown as Mock;
describe("adapters/polymarket/fills - fetchUserFills", () => {
  it("uses ClobClient.getFills when available and maps sides and numeric fields correctly", async () => {
    const clobClient = {
      getFills: vi.fn().mockResolvedValue([
        {
          id: "1",
          order_id: "o1",
          market_id: "m1",
          outcome: "Yes",
          side: "BUY",
          price: "0.5",
          size: "10",
          fee: "0.1",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "2",
          order_id: "o2",
          market_id: "m1",
          side: 0,
          price: 0.4,
          size: 5,
          fee: 0.05,
        },
        {
          id: "3",
          order_id: "o3",
          market_id: "m1",
          outcome: "No",
          side: "SELL",
          price: "0.6",
          size: "3",
          fee: "0.03",
        },
        {
          id: "4",
          order_id: "o4",
          market_id: "m1",
          side: 1,
          price: "0.7",
          size: "2",
          fee: "0.02",
        },
      ]),
    };

    getClobClientMock.mockResolvedValueOnce(clobClient);

    const fills = await fetchUserFills("0xUSER", 10, 0);
    expect(clobClient.getFills).toHaveBeenCalledTimes(1);
    expect(fills).toHaveLength(4);

    expect(fills[0].marketId).toBe("m1");
    expect(fills[0].side).toBe("yes");
    expect(fills[0].price).toBeCloseTo(0.5);
    expect(fills[0].size).toBeCloseTo(10);
    expect(fills[0].fee).toBeCloseTo(0.1);

    expect(fills[1].side).toBe("yes");
    expect(fills[2].side).toBe("no");
    expect(fills[2].outcome).toBe("No");
    expect(fills[3].side).toBe("no");
  });
});


