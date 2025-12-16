import { describe, it, expect, vi } from "vitest";
import type { OrderBook } from "@rekon/types";

vi.mock("./orderbook", () => ({
  getOrderBookByTokenId: vi.fn(),
}));

import { simulateOrder } from "./simulation";
import { getOrderBookByTokenId } from "./orderbook";
import { BadRequest, NotFound } from "../utils/http-errors";

const getOrderBookByTokenIdMock = vi.mocked(getOrderBookByTokenId);

describe("services/simulation - simulateOrder", () => {
  it("throws BadRequest for non-positive size", async () => {
    await expect(
      simulateOrder({
        tokenId: "token-1",
        side: "buy",
        size: 0,
        orderType: "market",
      })
    ).rejects.toMatchObject(BadRequest("Order size must be greater than 0"));
  });

  it("throws BadRequest when limit order is missing limitPrice", async () => {
    await expect(
      simulateOrder({
        tokenId: "token-1",
        side: "buy",
        size: 10,
        orderType: "limit",
      } as never)
    ).rejects.toMatchObject(
      BadRequest("Limit price is required for limit orders")
    );
  });

  it("throws NotFound when orderbook is missing", async () => {
    getOrderBookByTokenIdMock.mockResolvedValueOnce(null);

    await expect(
      simulateOrder({
        tokenId: "missing-token",
        side: "buy",
        size: 10,
        orderType: "market",
      })
    ).rejects.toMatchObject(
      NotFound("Orderbook not found for token: missing-token")
    );
  });

  it("simulates a buy market order across multiple asks", async () => {
    const orderBook: OrderBook = {
      marketId: "token-1",
      bids: [],
      asks: [
        { price: 0.5, size: 5 },
        { price: 0.6, size: 10 },
      ],
    };

    getOrderBookByTokenIdMock.mockResolvedValueOnce(orderBook);

    const result = await simulateOrder({
      tokenId: "token-1",
      side: "buy",
      size: 10,
      orderType: "market",
    });

    // 5 @ 0.5 + 5 @ 0.6 => totalCost = 2.5 + 3 = 5.5, avg = 0.55
    expect(result.side).toBe("buy");
    expect(result.size).toBeCloseTo(10);
    expect(result.totalCost).toBeCloseTo(5.5);
    expect(result.averagePrice).toBeCloseTo(0.55);
    expect(result.expectedPrice).toBeCloseTo(0.55);
    expect(result.fills).toHaveLength(2);
    expect(result.fills[0]).toMatchObject({ price: 0.5, size: 5 });
    expect(result.fills[1]).toMatchObject({ price: 0.6, size: 5 });
    // Liquidity: 5 + 10 = 15 -> depthUsed = 10/15
    expect(result.depthUsed).toBeCloseTo(10 / 15);
    expect(result.liquidityAvailable).toBeCloseTo(15);
  });

  it("simulates a sell market order across multiple bids", async () => {
    const orderBook: OrderBook = {
      marketId: "token-2",
      bids: [
        { price: 0.7, size: 4 },
        { price: 0.6, size: 6 },
      ],
      asks: [],
    };

    getOrderBookByTokenIdMock.mockResolvedValueOnce(orderBook);

    const result = await simulateOrder({
      tokenId: "token-2",
      side: "sell",
      size: 8,
      orderType: "market",
    });

    // 4 @ 0.7 + 4 @ 0.6 => totalCost = 2.8 + 2.4 = 5.2, avg = 0.65
    expect(result.side).toBe("sell");
    expect(result.size).toBeCloseTo(8);
    expect(result.totalCost).toBeCloseTo(5.2);
    expect(result.averagePrice).toBeCloseTo(0.65);
    expect(result.expectedPrice).toBeCloseTo(0.65);
    expect(result.fills).toHaveLength(2);
    expect(result.fills[0]).toMatchObject({ price: 0.7, size: 4 });
    expect(result.fills[1]).toMatchObject({ price: 0.6, size: 4 });
    // Liquidity: 4 + 6 = 10 -> depthUsed = 8/10
    expect(result.depthUsed).toBeCloseTo(8 / 10);
    expect(result.liquidityAvailable).toBeCloseTo(10);
  });

  it("throws BadRequest when buy limit order has no liquidity at or below limit", async () => {
    const orderBook: OrderBook = {
      marketId: "token-3",
      bids: [],
      asks: [
        { price: 0.6, size: 5 },
        { price: 0.7, size: 5 },
      ],
    };

    getOrderBookByTokenIdMock.mockResolvedValueOnce(orderBook);

    await expect(
      simulateOrder({
        tokenId: "token-3",
        side: "buy",
        size: 5,
        orderType: "limit",
        limitPrice: 0.55,
      })
    ).rejects.toMatchObject(
      BadRequest("No liquidity available at or below limit price: 0.55")
    );
  });

  it("throws BadRequest when sell limit order has no liquidity at or above limit", async () => {
    const orderBook: OrderBook = {
      marketId: "token-4",
      bids: [
        { price: 0.4, size: 5 },
        { price: 0.45, size: 5 },
      ],
      asks: [],
    };

    getOrderBookByTokenIdMock.mockResolvedValueOnce(orderBook);

    await expect(
      simulateOrder({
        tokenId: "token-4",
        side: "sell",
        size: 5,
        orderType: "limit",
        limitPrice: 0.5,
      })
    ).rejects.toMatchObject(
      BadRequest("No liquidity available at or above limit price: 0.5")
    );
  });
});
