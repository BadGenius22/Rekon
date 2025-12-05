"use client";

import { useState, useEffect } from "react";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";

interface PortfolioChartProps {
  portfolioValue: number;
  totalPnL: number; // Keep for reference/color coding
  userAddress: string;
  scope?: "all" | "esports";
}

interface HistoryPoint {
  timestamp: string;
  value: number;
}

const timeRanges = ["24H", "7D", "30D", "90D", "ALL"] as const;
type TimeRange = (typeof timeRanges)[number];

/**
 * Portfolio value/exposure chart component.
 * Shows esports portfolio value over time with time range selector.
 */
export function PortfolioChart({
  portfolioValue,
  totalPnL,
  userAddress,
  scope = "esports",
}: PortfolioChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("30D");
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch historical portfolio data from API
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userAddress) {
        setHistoryData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = new URL(`${API_CONFIG.baseUrl}/portfolio/history`);
        url.searchParams.set("user", userAddress);
        url.searchParams.set("scope", scope);
        url.searchParams.set("range", selectedRange);

        const response = await fetch(url.toString(), {
          next: { revalidate: 60 }, // Cache for 60 seconds
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch portfolio history: ${response.status}`
          );
        }

        const result = (await response.json()) as { data: HistoryPoint[] };
        setHistoryData(result.data || []);
      } catch (err) {
        console.error("Error fetching portfolio history:", err);
        setError("Failed to load portfolio history");
        setHistoryData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [userAddress, scope, selectedRange]);

  // Convert API history data to chart data points
  const convertHistoryToDataPoints = (
    history: HistoryPoint[]
  ): Array<{ x: number; y: number }> => {
    if (history.length === 0) {
      return [];
    }

    return history.map((point, index) => ({
      x: (index / (history.length - 1)) * 100,
      y: point.value,
    }));
  };

  // Generate fallback mock data if API data is not available
  const generateMockDataPoints = (
    range: TimeRange
  ): Array<{ x: number; y: number }> => {
    // Adjust number of points and volatility based on time range
    const pointConfig: Record<
      TimeRange,
      { points: number; volatility: number; cycles: number }
    > = {
      "24H": { points: 24, volatility: 0.25, cycles: 8 }, // Hourly data, high volatility
      "7D": { points: 28, volatility: 0.2, cycles: 4 }, // 6-hour intervals, medium volatility
      "30D": { points: 30, volatility: 0.15, cycles: 3 }, // Daily data, lower volatility
      "90D": { points: 30, volatility: 0.12, cycles: 2 }, // 3-day intervals, smooth trend
      ALL: { points: 50, volatility: 0.1, cycles: 1 }, // Long-term smooth trend
    };

    const config = pointConfig[range];
    const data: Array<{ x: number; y: number }> = [];

    // Use portfolio value as reference (always positive)
    const referenceValue = portfolioValue > 0 ? portfolioValue : 1000;
    const baseRange = referenceValue * 0.5; // Create volatility range

    // Different starting points based on range (simulate portfolio growth over time)
    // All ranges start from lower values and trend up to current value
    const startMultipliers: Record<TimeRange, number> = {
      "24H": 0.95, // Start 5% lower (recent volatility)
      "7D": 0.85, // Start 15% lower (weekly growth)
      "30D": 0.7, // Start 30% lower (monthly growth)
      "90D": 0.5, // Start 50% lower (quarterly growth)
      ALL: 0.3, // Start 70% lower (long-term growth)
    };

    const startValue = referenceValue * startMultipliers[range];
    const endValue = referenceValue; // End at current portfolio value

    for (let i = 0; i < config.points; i++) {
      const progress = i / (config.points - 1);
      // Create a trend from start to end
      const baseTrend = startValue + (endValue - startValue) * progress;

      // Add volatility with sine wave - more cycles for shorter timeframes
      // Portfolio value is always positive, so volatility should keep it above zero
      const volatilityRange = baseRange * config.volatility;

      const volatility =
        Math.sin(progress * Math.PI * config.cycles) * volatilityRange +
        Math.cos(progress * Math.PI * config.cycles * 1.5) *
          (volatilityRange * 0.5) +
        Math.sin(progress * Math.PI * config.cycles * 2.3) *
          (volatilityRange * 0.3);

      let value = baseTrend + volatility;

      // Ensure portfolio value stays positive (shouldn't go below zero)
      if (value < 0) {
        value = Math.abs(value) * 0.1; // Keep it positive but small
      }

      data.push({
        x: (i / (config.points - 1)) * 100,
        y: value,
      });
    }

    return data;
  };

  // Use API data if available, otherwise fall back to mock data
  const dataPoints =
    historyData.length > 0 && !error
      ? convertHistoryToDataPoints(historyData)
      : generateMockDataPoints(selectedRange);
  const allValues = dataPoints.map((d) => d.y);
  const maxValue = Math.max(...allValues, portfolioValue || 1000);
  const minValue = Math.max(0, Math.min(...allValues, portfolioValue * 0.3)); // Keep minimum positive
  const valueRange = maxValue - minValue || 1000; // Fallback to 1000 if range is 0

  // Calculate period-specific value change (change over the selected time range)
  // This is the difference between the first and last data point
  const periodValueChange =
    dataPoints.length > 0
      ? dataPoints[dataPoints.length - 1].y - dataPoints[0].y
      : 0;

  // Convert data points to SVG path
  // Scale Y to fit in 80% of height (leaving 10% margin top and bottom)
  const pathData = dataPoints
    .map((point, index) => {
      const normalizedY = (point.y - minValue) / valueRange;
      const yScaled = 10 + normalizedY * 80; // 10% margin top, 80% chart area
      const yPosition = 100 - yScaled; // Flip Y axis (SVG Y increases downward)
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(
        2
      )} ${yPosition.toFixed(2)}`;
    })
    .join(" ");

  // For portfolio value, baseline is at the bottom of the chart (minimum value)
  const baselineY = 100 - (10 + ((minValue - minValue) / valueRange) * 80);
  const areaPath = `${pathData} L 100 ${baselineY} L 0 ${baselineY} Z`;

  // Remove zero line since portfolio value is always positive

  // Determine line color based on portfolio value trend (period change)
  // Green if portfolio value increased over the period, red if decreased
  // 24H always shows green, other ranges follow period change
  const isPositive = selectedRange === "24H" || periodValueChange >= 0;
  const lineColor = isPositive ? "#10B981" : "#F43F5E"; // Emerald for positive, rose for negative
  const areaFillColor = isPositive
    ? "rgba(16, 185, 129, 0.06)" // Subtle emerald fill for positive
    : "rgba(244, 63, 94, 0.06)"; // Subtle rose fill for negative
  const lineGradientId = `gradient-${isPositive ? "positive" : "negative"}`;

  // Format Y-axis labels
  const formatYAxisLabel = (value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate Y-axis label positions
  const yAxisLabels = [0, 25, 50, 75, 100].map((yPercent) => {
    const value = minValue + valueRange * (yPercent / 100);
    return { y: yPercent, value };
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3">
      {/* Time Range Tabs */}
      <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.02] p-0.5 shrink-0 border border-white/5">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={cn(
              "h-8 rounded-md px-3.5 text-[11px] font-medium transition-all duration-200",
              selectedRange === range
                ? "bg-white/10 text-white shadow-sm border border-white/10"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
            )}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 min-h-0 rounded-lg border border-white/5 bg-gradient-to-br from-[#0C1224] to-[#080B16] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-sm text-white/50">Loading chart data...</div>
          </div>
        )}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-sm text-rose-400/70">{error}</div>
          </div>
        )}
        {/* Y-axis labels */}
        <div className="absolute left-5 top-5 bottom-5 w-12 pointer-events-none">
          {yAxisLabels.map(({ y, value }) => {
            // Calculate the actual Y position in the chart area (accounting for 10% top/bottom margins)
            const normalizedValue = (value - minValue) / valueRange;
            const chartY = 10 + normalizedValue * 80; // 10% margin top, 80% chart area
            const yPosition = 100 - chartY; // Flip for SVG coordinate system
            return (
              <div
                key={y}
                className="absolute text-[10px] font-mono font-medium text-white/35 leading-none tracking-tight"
                style={{
                  top: `${yPosition}%`,
                  transform: "translateY(-50%)",
                }}
              >
                {formatYAxisLabel(value)}
              </div>
            );
          })}
        </div>

        {/* Chart SVG */}
        <div className="ml-14 h-full min-h-0 relative z-0">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full"
            preserveAspectRatio="none"
            style={{ pointerEvents: "none" }}
          >
            {/* Gradient and filter definitions */}
            <defs>
              <linearGradient
                id={lineGradientId}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.4" />
              </linearGradient>
              <linearGradient
                id={`area-${lineGradientId}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={isPositive ? "#10B981" : "#F43F5E"}
                  stopOpacity="0.12"
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "#10B981" : "#F43F5E"}
                  stopOpacity="0.02"
                />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines - subtle horizontal lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="0.5"
              />
            ))}

            {/* Area fill with gradient - render first so line appears on top */}
            <path d={areaPath} fill={`url(#area-${lineGradientId})`} />

            {/* Chart line with gradient - professional color based on trend */}
            <path
              d={pathData}
              fill="none"
              stroke={`url(#${lineGradientId})`}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />

            {/* No zero baseline needed - portfolio value is always positive */}
          </svg>
        </div>

        {/* Chart value overlay - positioned to avoid Y-axis labels and chart line */}
        <div className="absolute right-5 top-5 flex flex-col items-end gap-1.5 z-20">
          <div className="flex flex-col items-end gap-0.5 px-3 py-2 rounded-lg bg-[#0C1224]/95 backdrop-blur-sm border border-white/5 shadow-lg">
            <div className="text-[9px] font-medium uppercase tracking-wider text-white/30">
              Portfolio Value
            </div>
            <span
              className={cn(
                "font-mono text-2xl font-semibold leading-none tracking-tight",
                "text-white"
              )}
            >
              $
              {portfolioValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 pt-1 px-3 py-2 rounded-lg bg-[#0C1224]/95 backdrop-blur-sm border border-white/5 shadow-lg">
            <div className="text-[9px] font-medium uppercase tracking-wider text-white/30">
              {selectedRange} Change
            </div>
            <div
              className={cn(
                "font-mono text-sm font-semibold leading-none tracking-tight",
                periodValueChange >= 0
                  ? "text-emerald-400/90"
                  : "text-rose-400/90"
              )}
            >
              {periodValueChange >= 0 ? "+" : ""}$
              {periodValueChange.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
