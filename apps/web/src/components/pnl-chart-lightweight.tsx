"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
  LineSeries,
} from "lightweight-charts";
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
 * PnL chart component using TradingView Lightweight Charts.
 * Shows profit/loss over time with zero baseline, similar to Polymarket.
 * Green above zero (profit), red below zero (loss).
 *
 * Performance: 10-100x faster than custom SVG
 * - Canvas rendering (not DOM)
 * - Handles 100K+ points smoothly
 * - Sub-10ms updates for real-time data
 */
export function PnLChartLightweight({
  totalPnL,
  userAddress,
  scope = "esports",
}: PnLChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("30D");
  const [historyData, setHistoryData] = useState<PnLHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodPnLChange, setPeriodPnLChange] = useState<number>(0);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Cache for API responses to avoid redundant fetches
  const cacheRef = useRef<
    Map<string, { data: PnLHistoryPoint[]; timestamp: number }>
  >(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const CACHE_TTL = 30000; // 30 seconds cache

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
        fontSize: 11,
      },
      grid: {
        vertLines: {
          color: "rgba(255, 255, 255, 0.04)",
          visible: true,
        },
        horzLines: {
          color: "rgba(255, 255, 255, 0.04)",
          visible: true,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(255, 255, 255, 0.1)",
        rightOffset: 0,
        barSpacing: 0,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        entireTextOnly: false,
      },
      crosshair: {
        mode: 1, // Normal mode - shows crosshair on hover
        vertLine: {
          color: "rgba(255, 255, 255, 0.3)",
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: "rgba(12, 18, 36, 0.98)",
          labelVisible: true,
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.3)",
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: "rgba(12, 18, 36, 0.98)",
          labelVisible: true,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    chartRef.current = chart;

    // Add line series (v5 API)
    const isPositive = totalPnL >= 0;
    const lineColor = isPositive ? "#10B981" : "#F43F5E";

    const lineSeries = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: lineColor,
      crosshairMarkerBackgroundColor: "rgba(255, 255, 255, 0.9)",
    });

    seriesRef.current = lineSeries;

    // Add zero baseline
    lineSeries.createPriceLine({
      price: 0,
      color: "rgba(255, 255, 255, 0.15)",
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: false,
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [totalPnL]);

  // Fetch historical PnL data from API with caching and abort support
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userAddress) {
        setHistoryData([]);
        setIsLoading(false);
        return;
      }

      // Abort previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Check cache first
      const cacheKey = `${userAddress}-${scope}-${selectedRange}`;
      const cached = cacheRef.current.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_TTL) {
        setHistoryData(cached.data);
        setIsLoading(false);
        setError(null);
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
          signal: abortController.signal,
          cache: "default",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PnL history: ${response.status}`);
        }

        const result = (await response.json()) as { data: PnLHistoryPoint[] };
        const data = result.data || [];

        // Update cache
        cacheRef.current.set(cacheKey, { data, timestamp: now });

        // Clean up old cache entries (keep only last 10)
        if (cacheRef.current.size > 10) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            cacheRef.current.delete(firstKey);
          }
        }

        if (!abortController.signal.aborted) {
          setHistoryData(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Error fetching PnL history:", err);
        if (!abortController.signal.aborted) {
          setError("Failed to load PnL history");
          setHistoryData([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory();
  }, [userAddress, scope, selectedRange]);

  // Convert history data to Lightweight Charts format
  const chartData = useMemo((): LineData[] => {
    if (historyData.length === 0) {
      // Generate mock data if no real data
      return generateMockData(selectedRange, totalPnL);
    }

    return historyData.map((point) => ({
      time: (new Date(point.timestamp).getTime() / 1000) as Time,
      value: point.pnl,
    }));
  }, [historyData, selectedRange, totalPnL]);

  // Update chart when data changes
  useEffect(() => {
    if (!seriesRef.current || chartData.length === 0) return;

    seriesRef.current.setData(chartData);

    // Update line color based on current PnL
    const isPositive = totalPnL >= 0;
    const lineColor = isPositive ? "#10B981" : "#F43F5E";
    seriesRef.current.applyOptions({
      color: lineColor,
    });

    // Zero baseline is already added in initialization, no need to update

    // Calculate period PnL change
    if (historyData.length > 0) {
      const currentPnL = historyData[historyData.length - 1]?.pnl ?? totalPnL;
      const startPnL = historyData[0]?.pnl ?? 0;
      setPeriodPnLChange(currentPnL - startPnL);
    } else if (chartData.length > 0) {
      const last = chartData[chartData.length - 1];
      const first = chartData[0];
      if (
        last &&
        first &&
        typeof last.value === "number" &&
        typeof first.value === "number"
      ) {
        setPeriodPnLChange(last.value - first.value);
      }
    }
  }, [chartData, historyData, totalPnL]);

  // Format price for display
  const formatPrice = useCallback((value: number): string => {
    const abs = Math.abs(value);
    if (abs >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  }, []);

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
            aria-pressed={selectedRange === range}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 min-h-0 rounded-lg border border-white/5 bg-gradient-to-br from-[#0C1224] to-[#080B16] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0C1224]/80 backdrop-blur-sm">
            <div className="text-sm text-white/50">Loading PnL data...</div>
          </div>
        )}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0C1224]/80 backdrop-blur-sm">
            <div className="text-sm text-rose-400/70">{error}</div>
          </div>
        )}

        {/* Chart */}
        <div ref={chartContainerRef} className="h-full w-full" />

        {/* Chart value overlay */}
        <div className="absolute right-5 top-5 flex flex-col items-end gap-1.5 z-20 pointer-events-none">
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
              {totalPnL >= 0 ? "+" : ""}
              {formatPrice(totalPnL)}
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
              {periodPnLChange >= 0 ? "+" : ""}
              {formatPrice(periodPnLChange)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate mock data points for fallback display
 */
function generateMockData(range: TimeRange, totalPnL: number): LineData[] {
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
  const data: LineData[] = [];

  const referenceValue = totalPnL !== 0 ? totalPnL : 100;
  const baseRange = Math.abs(referenceValue) * 0.8;

  const startMultipliers: Record<TimeRange, number> = {
    "24H": 0.7,
    "7D": 0.5,
    "30D": 0.3,
    "90D": 0.1,
    ALL: -0.2,
  };

  const startValue = referenceValue * startMultipliers[range];
  const endValue = referenceValue;
  const now = Date.now();
  const rangeMs =
    range === "24H"
      ? 24 * 60 * 60 * 1000
      : range === "7D"
      ? 7 * 24 * 60 * 60 * 1000
      : range === "30D"
      ? 30 * 24 * 60 * 60 * 1000
      : range === "90D"
      ? 90 * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < config.points; i++) {
    const progress = i / (config.points - 1);
    const baseTrend = startValue + (endValue - startValue) * progress;

    const volatilityRange = baseRange * config.volatility;
    const volatility =
      Math.sin(progress * Math.PI * config.cycles) * volatilityRange +
      Math.cos(progress * Math.PI * config.cycles * 1.5) *
        (volatilityRange * 0.5);

    const value = baseTrend + volatility;
    const timestamp = (now - rangeMs * (1 - progress)) / 1000;

    data.push({
      time: timestamp as Time,
      value,
    });
  }

  return data;
}
