import { describe, it, expect } from "vitest";
import type { PolymarketMarket } from "./types";
import { mapPolymarketMarket } from "./mapMarket";

describe("adapters/polymarket/mapPolymarketMarket", () => {
  it("maps a basic Polymarket market to a normalized Market", () => {
    const pmMarket: PolymarketMarket = {
      id: "123",
      question: "Will Team A win the final?",
      conditionId: "cond-1",
      slug: "will-team-a-win-the-final",
      twitterCardImage: "",
      resolutionSource: "official site",
      endDate: "2024-12-31T00:00:00Z",
      category: "Esports",
      ammType: "clob",
      liquidity: "5000",
      sponsorName: "",
      sponsorImage: "",
      startDate: "2024-01-01T00:00:00Z",
      xAxisValue: "",
      yAxisValue: "",
      denominationToken: "USDC",
      fee: "0.02",
      image: "https://example.com/image.png",
      icon: "",
      lowerBound: "",
      upperBound: "",
      description: "",
      outcomes: "Yes,No",
      outcomePrices: "0.6,0.4",
      volume: "10000",
      active: true,
      marketType: "binary",
      formatType: "standard",
      lowerBoundDate: "",
      upperBoundDate: "",
      closed: false,
      marketMakerAddress: "0xMM",
      createdBy: 1,
      updatedBy: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      closedTime: "",
      wideFormat: false,
      new: false,
      mailchimpTag: "",
      featured: false,
      archived: false,
      resolvedBy: "",
      restricted: false,
      marketGroup: 0,
      groupItemTitle: "",
      groupItemThreshold: "",
      questionID: "",
      umaEndDate: "",
      enableOrderBook: true,
      orderPriceMinTickSize: 0.001,
      orderMinSize: 0.01,
      umaResolutionStatus: "",
      curationOrder: 0,
      volumeNum: 10000,
      liquidityNum: 5000,
      endDateIso: "2024-12-31T00:00:00Z",
      startDateIso: "2024-01-01T00:00:00Z",
      umaEndDateIso: "",
      hasReviewedDates: false,
      readyForCron: true,
      commentsEnabled: true,
      volume24hr: 1234,
      volume1wk: 0,
      volume1mo: 0,
      volume1yr: 0,
      gameStartTime: "",
      secondsDelay: 0,
      clobTokenIds: "0xYES,0xNO",
      disqusThread: "",
      shortOutcomes: "",
      teamAID: "",
      teamBID: "",
      umaBond: "",
      umaReward: "",
      fpmmLive: false,
      volume24hrAmm: 0,
      volume1wkAmm: 0,
      volume1moAmm: 0,
      volume1yrAmm: 0,
      volume24hrClob: 0,
      volume1wkClob: 0,
      volume1moClob: 0,
      volume1yrClob: 0,
      volumeAmm: 0,
      volumeClob: 0,
      liquidityAmm: 0,
      liquidityClob: 0,
      makerBaseFee: 50, // 0.5%
      takerBaseFee: 200, // 2%
      customLiveness: 0,
      acceptingOrders: true,
      notificationsEnabled: true,
      score: 0,
      imageOptimized: {
        id: "img-1",
        imageUrlSource: "https://example.com/image.png",
        imageUrlOptimized: "https://cdn.example.com/image-opt.png",
        imageSizeKbSource: 100,
        imageSizeKbOptimized: 50,
        imageOptimizedComplete: true,
        imageOptimizedLastUpdated: "2024-01-01T00:00:00Z",
        relID: 1,
        field: "image",
        relname: "market",
      },
      iconOptimized: {
        id: "icon-1",
        imageUrlSource: "",
        imageUrlOptimized: "",
        imageSizeKbSource: 0,
        imageSizeKbOptimized: 0,
        imageOptimizedComplete: false,
        imageOptimizedLastUpdated: "",
        relID: 0,
        field: "",
        relname: "",
      },
      events: [],
      categories: [
        {
          id: "1",
          slug: "esports",
          label: "Esports",
          parentCategory: "Sports",
          publishedAt: "2024-01-01T00:00:00Z",
          createdBy: "system",
          updatedBy: "system",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      tags: [],
      creator: "0xCREATOR",
      ready: true,
      funded: true,
      pastSlugs: "",
      readyTimestamp: "",
      fundedTimestamp: "",
      acceptingOrdersTimestamp: "",
      competitive: 0,
      rewardsMinSize: 0,
      rewardsMaxSpread: 0,
      spread: 0,
      automaticallyResolved: false,
      oneDayPriceChange: 0.1,
      oneHourPriceChange: -0.02,
      oneWeekPriceChange: 0.3,
      oneMonthPriceChange: 0,
      oneYearPriceChange: 0,
      lastTradePrice: 0.6,
      bestBid: 0.59,
      bestAsk: 0.61,
      automaticallyActive: false,
      clearBookOnStart: false,
      chartColor: "",
      seriesColor: "",
      showGmpSeries: false,
      showGmpOutcome: false,
      manualActivation: false,
      negRiskOther: false,
      gameId: "",
      groupItemRange: "",
      sportsMarketType: "",
      line: 0,
      umaResolutionStatuses: "",
      pendingDeployment: false,
      deploying: false,
      deployingTimestamp: "",
      scheduledDeploymentTimestamp: "",
      rfqEnabled: false,
      eventStartTime: "",
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


