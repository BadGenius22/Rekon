import { describe, it, expect, vi, type Mock } from "vitest";
import type { Order, TradePlacementRequest } from "@rekon/types";

vi.mock("./markets", () => ({
  getMarketById: vi.fn(),
}));

vi.mock("./orders", () => ({
  placeOrder: vi.fn(),
}));

vi.mock("./user-orders", () => ({
  postUserOrder: vi.fn(),
}));

import { placeTrade, resolveMarketForTrade } from "./trade-placement";
import { getMarketById } from "./markets";
import { placeOrder } from "./orders";
import { postUserOrder } from "./user-orders";
import { BadRequest, NotFound } from "../utils/http-errors";

const getMarketByIdMock = getMarketById as unknown as Mock;
const placeOrderMock = placeOrder as unknown as Mock;
const postUserOrderMock = postUserOrder as unknown as Mock;

describe("services/trade-placement - resolveMarketForTrade", () => {
  it("throws NotFound when market does not exist", async () => {
    getMarketByIdMock.mockResolvedValueOnce(null);

    await expect(
      resolveMarketForTrade("missing-market", "yes")
    ).rejects.toMatchObject(NotFound("Market not found: missing-market"));
  });

  it("throws BadRequest when outcome token is missing", async () => {
    getMarketByIdMock.mockResolvedValueOnce({
      id: "market-1",
      question: "Will Team A win?",
      slug: "team-a-win",
      conditionId: "cond-1",
      resolutionSource: "oracle",
      endDate: "2024-12-31T00:00:00.000Z",
      outcomes: [
        { id: "out-yes", name: "Yes", price: 0.5, volume: 0 },
        { id: "out-no", name: "No", price: 0.5, volume: 0 },
      ],
      volume: 0,
      liquidity: 0,
      isResolved: false,
      active: true,
      closed: false,
      tradingPaused: false,
      acceptingOrders: true,
    });

    await expect(
      resolveMarketForTrade("market-1", "yes")
    ).rejects.toMatchObject(
      BadRequest(
        'Token ID not available for outcome "Yes" in market market-1'
      )
    );
  });

  it("resolves market and outcome token for yes side", async () => {
    getMarketByIdMock.mockResolvedValueOnce({
      id: "market-1",
      question: "Will Team A win?",
      slug: "team-a-win",
      conditionId: "cond-1",
      resolutionSource: "oracle",
      endDate: "2024-12-31T00:00:00.000Z",
      outcomes: [
        {
          id: "out-yes",
          name: "Yes",
          price: 0.5,
          volume: 0,
          tokenAddress: "0xTOKEN_YES",
        },
        {
          id: "out-no",
          name: "No",
          price: 0.5,
          volume: 0,
        },
      ],
      volume: 0,
      liquidity: 0,
      isResolved: false,
      active: true,
      closed: false,
      tradingPaused: false,
      acceptingOrders: true,
    });

    const resolution = await resolveMarketForTrade("market-1", "yes");

    expect(resolution.marketId).toBe("market-1");
    expect(resolution.conditionId).toBe("cond-1");
    expect(resolution.tokenId).toBe("0xTOKEN_YES");
    expect(resolution.outcome).toBe("Yes");
    expect(resolution.tickSize).toBe("0.001");
    expect(resolution.negRisk).toBe(false);
    expect(resolution.minOrderSize).toBeCloseTo(0.01);
  });
});

describe("services/trade-placement - placeTrade", () => {
  const baseMarket = {
    id: "market-1",
    question: "Will Team A win?",
    slug: "team-a-win",
    conditionId: "cond-1",
    resolutionSource: "oracle",
    endDate: "2024-12-31T00:00:00.000Z",
    outcomes: [
      {
        id: "out-yes",
        name: "Yes",
        price: 0.5,
        volume: 0,
        tokenAddress: "0xTOKEN_YES",
      },
      {
        id: "out-no",
        name: "No",
        price: 0.5,
        volume: 0,
        tokenAddress: "0xTOKEN_NO",
      },
    ],
    volume: 0,
    liquidity: 0,
    isResolved: false,
    active: true,
    closed: false,
    tradingPaused: false,
    acceptingOrders: true,
  };

  it("throws BadRequest when size is invalid", async () => {
    const badRequest: TradePlacementRequest = {
      marketId: "market-1",
      side: "yes",
      size: 0,
      slippage: 0.01,
    };

    await expect(placeTrade(badRequest)).rejects.toMatchObject(
      BadRequest("Size must be greater than 0")
    );
  });

  it("places a builder-signed market order via placeOrder", async () => {
    getMarketByIdMock.mockResolvedValueOnce(baseMarket);

    const order: Order = {
      id: "order-1",
      marketId: "market-1",
      outcome: "Yes",
      side: "yes",
      type: "market",
      price: undefined,
      amount: 10,
      filled: 0,
      status: "pending",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    placeOrderMock.mockResolvedValueOnce(order);

    const response = await placeTrade(
      {
        marketId: "market-1",
        side: "yes",
        size: 10,
      },
      null
    );

    expect(placeOrderMock).toHaveBeenCalledTimes(1);
    expect(response.orderId).toBe("order-1");
    expect(response.status).toBe("pending");
    expect(response.marketId).toBe("market-1");
    expect(response.outcome).toBe("Yes");
    expect(response.side).toBe("yes");
    expect(response.type).toBe("market");
    expect(response.price).toBe(0); // default for market orders
    expect(response.size).toBe(10);
    expect(response.filled).toBe(0);
    expect(response.remaining).toBe(10);
    expect(response.execution.averagePrice).toBeUndefined();
    expect(response.execution.totalCost).toBeUndefined();
    expect(response.execution.timestamp).toBe(order.createdAt);
  });

  it("places a user-signed order via postUserOrder and maps response", async () => {
    getMarketByIdMock.mockResolvedValueOnce(baseMarket);

    const order: Order = {
      id: "order-2",
      marketId: "market-1",
      outcome: "Yes",
      side: "yes",
      type: "limit",
      price: 0.6,
      amount: 10,
      filled: 5,
      status: "open",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    postUserOrderMock.mockResolvedValueOnce(order);

    const response = await placeTrade(
      {
        marketId: "market-1",
        side: "yes",
        size: 10,
        signedOrder: {
          order: {
            tokenID: "0xTOKEN_YES",
            // other fields are opaque here; service passes through
          } as never,
          signatureType: "1",
        },
      } as TradePlacementRequest,
      null
    );

    expect(postUserOrderMock).toHaveBeenCalledTimes(1);
    expect(response.orderId).toBe("order-2");
    // Filled 5 of 10 -> status "open", remaining 5
    expect(response.status).toBe("open");
    expect(response.remaining).toBe(5);
    expect(response.filled).toBe(5);
    expect(response.execution.averagePrice).toBe(0.6);
    expect(response.execution.totalCost).toBeCloseTo(5 * 0.6);
  });
});


