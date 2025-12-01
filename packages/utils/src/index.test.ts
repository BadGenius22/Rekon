import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatVolume,
  formatPercentage,
  calculateUnrealizedPnL,
} from "./index";

describe("utils/formatting", () => {
  it("formats price with default decimals", () => {
    expect(formatPrice(0.123456)).toBe("0.1235");
  });

  it("formats large volume with suffixes", () => {
    expect(formatVolume(1234)).toBe("1.23K");
    expect(formatVolume(2_500_000)).toBe("2.50M");
  });

  it("formats percentage values", () => {
    expect(formatPercentage(0.1234)).toBe("12.34%");
  });
});

describe("utils/pnl", () => {
  it("calculates unrealized PnL for YES side", () => {
    const pnl = calculateUnrealizedPnL(0.4, 0.6, 100, "yes");
    expect(pnl).toBeCloseTo(20); // (0.6 - 0.4) * 100
  });

  it("calculates unrealized PnL for NO side", () => {
    const pnl = calculateUnrealizedPnL(0.6, 0.4, 100, "no");
    expect(pnl).toBeCloseTo(20); // (0.6 - 0.4) * 100
  });
});


