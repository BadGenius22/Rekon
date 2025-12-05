"use client";

import { useState, useEffect } from "react";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";

interface PnLChartProps {
  totalPnL: number;
  userAddress: string;
  scope?: "all" | "esports";
}

interface PnLHistoryPoint {
  timestamp: string;
  pnl: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

const timeRanges = ["24H", "7D", "30D", "90D", "ALL"] as const;
type TimeRange = (typeof timeRanges)[number];

/**
 * PnL chart component.
 * Shows profit/loss over time with zero baseline, similar to Polymarket.
 * Green above zero (profit), red below zero (loss).
 */
export function PnLChart({
  totalPnL,
  userAddress,
  scope = "esports",
}: PnLChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("30D");
  const [historyData, setHistoryData] = useState<PnLHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch historical PnL data from API
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
        const url = new URL(`${API_CONFIG.baseUrl}/portfolio/pnl-history`);
        url.searchParams.set("user", userAddress);
        url.searchParams.set("scope", scope);
        url.searchParams.set("range", selectedRange);

        const response = await fetch(url.toString(), {
          cache: "no-store", // Client-side fetch - don't cache
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PnL history: ${response.status}`);
        }

        const result = (await response.json()) as { data: PnLHistoryPoint[] };
        setHistoryData(result.data || []);
      } catch (err) {
        console.error("Error fetching PnL history:", err);
        setError("Failed to load PnL history");
        setHistoryData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [userAddress, scope, selectedRange]);

  // Convert API history data to chart data points
  const convertHistoryToDataPoints = (
    history: PnLHistoryPoint[]
  ): Array<{ x: number; y: number }> => {
    if (history.length === 0) {
      return [];
    }

    return history.map((point, index) => ({
      x: (index / (history.length - 1)) * 100,
      y: point.pnl,
    }));
  };

  // Generate fallback mock data if API data is not available
  const generateMockDataPoints = (
    range: TimeRange
  ): Array<{ x: number; y: number }> => {
    const pointConfig: Record<
      TimeRange,
      { points: number; volatility: number; cycles: number }
    > = {
      "24H": { points: 24, volatility: 0.3, cycles: 8 },
      "7D": { points: 28, volatility: 0.25, cycles: 4 },
      "30D": { points: 30, volatility: 0.2, cycles: 3 },
      "90D": { points: 30, volatility: 0.15, cycles: 2 },
      ALL: { points: 50, volatility: 0.1, cycles: 1 },
    };

    const config = pointConfig[range];
    const data: Array<{ x: number; y: number }> = [];

    // Use totalPnL as reference (can be positive or negative)
    const referenceValue = totalPnL !== 0 ? totalPnL : 100;
    const baseRange = Math.abs(referenceValue) * 0.8;

    // Start from lower PnL and trend to current
    const startMultipliers: Record<TimeRange, number> = {
      "24H": 0.7,
      "7D": 0.5,
      "30D": 0.3,
      "90D": 0.1,
      ALL: -0.2, // Can start negative for long-term
    };

    const startValue = referenceValue * startMultipliers[range];
    const endValue = referenceValue;

    for (let i = 0; i < config.points; i++) {
      const progress = i / (config.points - 1);
      const baseTrend = startValue + (endValue - startValue) * progress;

      const volatilityRange = baseRange * config.volatility;
      const volatility =
        Math.sin(progress * Math.PI * config.cycles) * volatilityRange +
        Math.cos(progress * Math.PI * config.cycles * 1.5) *
          (volatilityRange * 0.5);

      const value = baseTrend + volatility;

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
  const maxValue = Math.max(...allValues, totalPnL, 0);
  const minValue = Math.min(...allValues, totalPnL, 0);
  const valueRange = maxValue - minValue || 1000;

  // Calculate period-specific PnL change from real data
  // Find the PnL value at the start of the period and compare to current
  const calculatePeriodChange = (): number => {
    if (historyData.length === 0 || error) {
      // If no real data, calculate from mock data points
      return dataPoints.length > 0
        ? dataPoints[dataPoints.length - 1].y - dataPoints[0].y
        : 0;
    }

    // Get current PnL (last point in history)
    const currentPnL = historyData[historyData.length - 1]?.pnl ?? totalPnL;

    // Calculate the time period in milliseconds
    const now = new Date();
    let periodMs: number;
    switch (selectedRange) {
      case "24H":
        periodMs = 24 * 60 * 60 * 1000;
        break;
      case "7D":
        periodMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case "30D":
        periodMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case "90D":
        periodMs = 90 * 24 * 60 * 60 * 1000;
        break;
      case "ALL":
        // For ALL, use the first data point
        return currentPnL - (historyData[0]?.pnl ?? 0);
    }

    // Find the data point closest to the start of the period
    const periodStartTime = now.getTime() - periodMs;
    let closestPoint = historyData[0];
    let minTimeDiff = Math.abs(
      new Date(historyData[0]?.timestamp ?? 0).getTime() - periodStartTime
    );

    for (const point of historyData) {
      const pointTime = new Date(point.timestamp).getTime();
      const timeDiff = Math.abs(pointTime - periodStartTime);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestPoint = point;
      }
    }

    // Calculate change from period start to now
    const periodStartPnL = closestPoint?.pnl ?? 0;
    return currentPnL - periodStartPnL;
  };

  const periodPnLChange = calculatePeriodChange();

  // Find zero line position (for baseline)
  const zeroYPercent =
    maxValue > 0 && minValue < 0
      ? ((0 - minValue) / valueRange) * 100
      : minValue >= 0
      ? 0
      : 100; // All positive or all negative

  // Convert data points to SVG path
  // Scale Y to fit in 80% of height (leaving 10% margin top and bottom)
  const pathData = dataPoints
    .map((point, index) => {
      const normalizedY = (point.y - minValue) / valueRange;
      const yScaled = 10 + normalizedY * 80;
      const yPosition = 100 - yScaled;
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(
        2
      )} ${yPosition.toFixed(2)}`;
    })
    .join(" ");

  // Create area path - fill to zero line
  const zeroYPosition = 100 - (10 + (zeroYPercent / 100) * 80);
  const areaPath = `${pathData} L 100 ${zeroYPosition} L 0 ${zeroYPosition} Z`;

  // Determine colors based on current PnL
  const isPositive = totalPnL >= 0;
  const lineColor = isPositive ? "#10B981" : "#F43F5E";
  const areaFillColor = isPositive
    ? "rgba(16, 185, 129, 0.08)"
    : "rgba(244, 63, 94, 0.08)";
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
            <div className="text-sm text-white/50">Loading PnL data...</div>
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
            const normalizedValue = (value - minValue) / valueRange;
            const chartY = 10 + normalizedValue * 80;
            const yPosition = 100 - chartY;
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
                  stopOpacity="0.15"
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "#10B981" : "#F43F5E"}
                  stopOpacity="0.03"
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

            {/* Grid lines */}
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

            {/* Zero baseline - important for PnL charts */}
            {minValue < 0 && maxValue > 0 && (
              <line
                x1="0"
                y1={zeroYPosition}
                x2="100"
                y2={zeroYPosition}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            )}

            {/* Area fill */}
            <path d={areaPath} fill={`url(#area-${lineGradientId})`} />

            {/* Chart line */}
            <path
              d={pathData}
              fill="none"
              stroke={`url(#${lineGradientId})`}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          </svg>
        </div>

        {/* Chart value overlay */}
        <div className="absolute right-5 top-5 flex flex-col items-end gap-1.5 z-20">
          <div className="flex flex-col items-end gap-0.5 px-3 py-2 rounded-lg bg-[#0C1224]/95 backdrop-blur-sm border border-white/5 shadow-lg">
            <div className="text-[9px] font-medium uppercase tracking-wider text-white/30">
              Total PnL
            </div>
            <span
              className={cn(
                "font-mono text-2xl font-semibold leading-none tracking-tight",
                totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {totalPnL >= 0 ? "+" : ""}$
              {totalPnL.toLocaleString("en-US", {
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
                periodPnLChange >= 0
                  ? "text-emerald-400/90"
                  : "text-rose-400/90"
              )}
            >
              {periodPnLChange >= 0 ? "+" : ""}$
              {periodPnLChange.toLocaleString("en-US", {
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
