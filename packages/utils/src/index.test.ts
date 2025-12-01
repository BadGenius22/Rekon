import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatVolume,
  formatPercentage,
  calculateUnrealizedPnL,
  calculateOrderBookTotal,
  formatOrderBookPrice,
} from "./index";

describe("utils/formatting", () => {
  it("formats price with default decimals", () => {
    expect(formatPrice(0.123456)).toBe("0.1235");
  });

  it("formats price with custom decimals", () => {
    expect(formatPrice(0.123456, 2)).toBe("0.12");
  });

  it("formats zero price correctly", () => {
    expect(formatPrice(0)).toBe("0.0000");
  });

  it("formats large volume with suffixes", () => {
    expect(formatVolume(1234)).toBe("1.23K");
    expect(formatVolume(2_500_000)).toBe("2.50M");
  });

  it("formats small and zero volumes without suffix", () => {
    expect(formatVolume(0)).toBe("0.00");
    expect(formatVolume(999.999)).toBe("1000.00");
  });

  it("formats percentage values", () => {
    expect(formatPercentage(0.1234)).toBe("12.34%");
  });

  it("formats negative percentage values", () => {
    expect(formatPercentage(-0.0567)).toBe("-5.67%");
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

  it("handles zero size with zero PnL", () => {
    const pnlYes = calculateUnrealizedPnL(0.4, 0.6, 0, "yes");
    const pnlNo = calculateUnrealizedPnL(0.6, 0.4, 0, "no");
    expect(pnlYes).toBe(0);
    expect(pnlNo).toBe(0);
  });

  it("allows negative PnL when current price is worse", () => {
    const pnl = calculateUnrealizedPnL(0.6, 0.4, 100, "yes");
    expect(pnl).toBeCloseTo(-20);
  });
});

describe("utils/orderbook", () => {
  it("calculates total size from orderbook entries", () => {
    const total = calculateOrderBookTotal([
      { amount: 1 },
      { amount: 2.5 },
      { amount: 0.5 },
    ]);
    expect(total).toBeCloseTo(4);
  });

  it("returns 0 for empty orderbook", () => {
    const total = calculateOrderBookTotal([]);
    expect(total).toBe(0);
  });

  it("formats orderbook price with 4 decimals", () => {
    expect(formatOrderBookPrice(0.123456)).toBe("0.1235");
    expect(formatOrderBookPrice(1)).toBe("1.0000");
  });
});
