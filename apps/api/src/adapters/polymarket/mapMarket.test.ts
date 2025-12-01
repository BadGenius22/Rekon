import { describe, it, expect } from "vitest";
import type { PolymarketMarket } from "./types";
import { mapPolymarketMarket } from "./mapMarket";

describe("adapters/polymarket/mapPolymarketMarket", () => {
  it("maps a basic Polymarket market to a normalized Market", () => {
    const pmMarket: PolymarketMarket = {
      id: "123",
      question: "Will Team A win the final?",
      conditionId: "cond-1",
      resolutionSource: "official site",
      endDate: "2024-12-31T00:00:00Z",
      endDateIso: "2024-12-31T00:00:00Z",
      closed: false,
      automaticallyResolved: false,
      resolvedBy: null,
      active: true,
      acceptingOrders: true,
      outcomes: "Yes,No",
      outcomePrices: "0.6,0.4",
      clobTokenIds: "0xYES,0xNO",
      image: "https://example.com/image.png",
      imageOptimized: {
        imageUrlOptimized: "https://cdn.example.com/image-opt.png",
        imageUrlSource: "https://example.com/image.png",
      },
      volume: "10000",
      volumeNum: 10000,
      liquidity: "5000",
      liquidityNum: 5000,
      fee: "0.02",
      makerBaseFee: 50, // 0.5%
      takerBaseFee: 200, // 2%
      umaEndDate: null,
      umaEndDateIso: null,
      category: "Esports",
      categories: [
        {
          id: "1",
          slug: "esports",
          label: "Esports",
          parentCategory: "Sports",
        },
      ],
      creator: "0xCREATOR",
      marketMakerAddress: "0xMM",
      volume24hr: 1234,
      oneDayPriceChange: 0.1,
      oneHourPriceChange: -0.02,
      oneWeekPriceChange: 0.3,
      slug: "will-team-a-win-the-final",
    };

    const market = mapPolymarketMarket(pmMarket);

    expect(market.id).toBe("123");
    expect(market.question).toBe("Will Team A win the final?");
    expect(market.slug).toBe("will-team-a-win-the-final");
    expect(market.conditionId).toBe("cond-1");
    expect(market.resolutionSource).toBe("official site");
    expect(market.endDate).toBe("2024-12-31T00:00:00Z");
    expect(market.imageUrl).toBe("https://cdn.example.com/image-opt.png");

    expect(market.outcomes).toHaveLength(2);
    expect(market.outcomes[0]).toMatchObject({
      id: "cond-1-0",
      name: "Yes",
      price: 0.6,
      tokenAddress: "0xYES",
      impliedProbability: 0.6,
    });
    expect(market.outcomes[1]).toMatchObject({
      id: "cond-1-1",
      name: "No",
      price: 0.4,
      tokenAddress: "0xNO",
      impliedProbability: 0.4,
    });

    expect(market.outcomeTokens).toEqual(["0xYES", "0xNO"]);
    expect(market.impliedProbabilities).toEqual([0.6, 0.4]);

    expect(market.volume).toBe(10000);
    expect(market.liquidity).toBe(5000);
    expect(market.fee).toBe(0.02);
    expect(market.makerFee).toBeCloseTo(0.005);
    expect(market.takerFee).toBeCloseTo(0.02);

    expect(market.category).toBe("Esports");
    expect(market.subcategory).toBe("Sports");
    expect(market.creator).toBe("0xCREATOR");
    expect(market.marketMakerAddress).toBe("0xMM");

    expect(market.active).toBe(true);
    expect(market.closed).toBe(false);
    expect(market.tradingPaused).toBe(false);
    expect(market.acceptingOrders).toBe(true);

    expect(market.settlementType).toBe("manual");
    expect(market.settlementDate).toBe("2024-12-31T00:00:00Z");
    expect(market.resolvedBy).toBeUndefined();

    expect(market.volume24h).toBe(1234);
    expect(market.priceChange24h).toBe(0.1);
    expect(market.priceChange1h).toBe(-0.02);
    expect(market.priceChange1w).toBe(0.3);
  });

  it("uses defaults when outcomes/prices are missing", () => {
    const pmMarket = {
      id: "456",
      question: "Generic market?",
      conditionId: "cond-2",
      resolutionSource: "source",
      endDate: "2024-12-31T00:00:00Z",
      endDateIso: "2024-12-31T00:00:00Z",
      closed: false,
      automaticallyResolved: false,
      resolvedBy: null,
      active: true,
      acceptingOrders: true,
      outcomes: "",
      outcomePrices: "",
      clobTokenIds: "",
    } as unknown as PolymarketMarket;

    const market = mapPolymarketMarket(pmMarket);
    expect(market.outcomes).toHaveLength(2);
    expect(market.outcomes[0].name).toBe("Yes");
    expect(market.outcomes[1].name).toBe("No");
  });
});


