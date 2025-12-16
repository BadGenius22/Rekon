import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("../adapters/polymarket/builder", () => {
  return {
    fetchMyBuilderStats: vi.fn(),
  };
});

import { getBuilderVolumeAnalytics } from "./analytics";
import * as builderModule from "../adapters/polymarket/builder";

describe("services/analytics - getBuilderVolumeAnalytics", () => {
  it("returns analytics based on BuilderVolumeData", async () => {
    const fetchMyBuilderStatsMock =
      builderModule.fetchMyBuilderStats as unknown as Mock;

    // Mock returns actual BuilderVolumeData type
    fetchMyBuilderStatsMock.mockResolvedValueOnce({
      address: "builder-address-123",
      name: "Rekon",
      volume: 1_000_000,
      tradeCount: 500,
      period: "all",
    });

    const analytics = await getBuilderVolumeAnalytics();

    // Should not be null when stats are available
    expect(analytics).not.toBeNull();
    expect(analytics!.builderId).toBe("builder-address-123");
    expect(analytics!.builderName).toBe("Rekon");
    expect(analytics!.totalVolume).toBe(1_000_000);
    expect(analytics!.totalTradesLast30d).toBe(500);
    // Fields not available from current API
    expect(analytics!.currentRank).toBe(0);
    expect(analytics!.dailyVolume).toBe(0);
    expect(analytics!.weeklyVolume).toBe(0);
    expect(analytics!.monthlyVolume).toBe(1_000_000); // Uses total as approximation
    expect(analytics!.series).toEqual([]);
  });

  it("returns null when no builder stats available", async () => {
    const fetchMyBuilderStatsMock =
      builderModule.fetchMyBuilderStats as unknown as Mock;

    fetchMyBuilderStatsMock.mockResolvedValueOnce(null);

    const analytics = await getBuilderVolumeAnalytics();

    expect(analytics).toBeNull();
  });

  it("uses 'Unknown Builder' when name is not provided", async () => {
    const fetchMyBuilderStatsMock =
      builderModule.fetchMyBuilderStats as unknown as Mock;

    fetchMyBuilderStatsMock.mockResolvedValueOnce({
      address: "builder-address-456",
      volume: 500_000,
      tradeCount: 200,
    });

    const analytics = await getBuilderVolumeAnalytics();

    expect(analytics).not.toBeNull();
    expect(analytics!.builderName).toBe("Unknown Builder");
  });
});
