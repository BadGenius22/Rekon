import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("../adapters/polymarket/builder", () => {
  return {
    fetchMyBuilderStats: vi.fn(),
    fetchBuilderVolume: vi.fn(),
  };
});

import { getBuilderVolumeAnalytics } from "./analytics";
import * as builderModule from "../adapters/polymarket/builder";

describe("services/analytics - getBuilderVolumeAnalytics", () => {
  it("computes aggregates and series from builder stats and volume data", async () => {
    const fetchMyBuilderStatsMock =
      builderModule.fetchMyBuilderStats as unknown as Mock;
    const fetchBuilderVolumeMock =
      builderModule.fetchBuilderVolume as unknown as Mock;

    fetchMyBuilderStatsMock.mockResolvedValueOnce({
      builderId: "builder-1",
      builderName: "Rekon",
      totalVolume: 1_000_000,
      currentRank: 5,
      dailyVolume: 10_000,
      weeklyVolume: 70_000,
      monthlyVolume: 300_000,
    });

    fetchBuilderVolumeMock.mockResolvedValueOnce([
      // Older data (beyond last 30 days, should be sliced out if longer)
      { date: "2024-01-01", volume: 1000, trades: 10 },
      // Last 3 days (simple example)
      { date: "2024-01-02", volume: 2000, trades: 20 },
      { date: "2024-01-03", volume: 3000, trades: 30 },
      { date: "2024-01-04", volume: 4000, trades: 40 },
    ]);

    const analytics = await getBuilderVolumeAnalytics();

    expect(analytics.builderId).toBe("builder-1");
    expect(analytics.builderName).toBe("Rekon");
    expect(analytics.totalVolume).toBe(1_000_000);
    expect(analytics.currentRank).toBe(5);
    expect(analytics.dailyVolume).toBe(10_000);
    expect(analytics.weeklyVolume).toBe(70_000);
    expect(analytics.monthlyVolume).toBe(300_000);

    // recentSeries is the last up to 30 entries; here it's all 4
    expect(analytics.series).toHaveLength(4);
    expect(analytics.series[0]).toEqual({
      date: "2024-01-01",
      volume: 1000,
      trades: 10,
    });
    expect(analytics.series[3]).toEqual({
      date: "2024-01-04",
      volume: 4000,
      trades: 40,
    });

    // totalTradesLast30d is the sum of trades in recentSeries
    expect(analytics.totalTradesLast30d).toBe(10 + 20 + 30 + 40);
  });
});
