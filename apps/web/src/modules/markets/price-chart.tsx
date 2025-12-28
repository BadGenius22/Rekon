"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";

interface PriceChartProps {
  conditionId: string;
  team1Name: string;
  team2Name: string;
  team1Price: number;
  team2Price: number;
  team1TokenId?: string;
  team2TokenId?: string;
}

interface PricePoint {
  timestamp: number;
  team1Price: number;
  team2Price: number;
}

interface ApiPricePoint {
  timestamp: number;
  team1Price: number;
  team2Price: number;
}

type TimeRange = "1h" | "3h" | "1d" | "1w" | "1m";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "3h", label: "3h" },
  { value: "1d", label: "1d" },
  { value: "1w", label: "1w" },
  { value: "1m", label: "1m" },
];

function formatTime(timestamp: number, range: TimeRange): string {
  const date = new Date(timestamp);

  // For 1h and 3h, show time in HH:mm format
  if (range === "1h" || range === "3h") {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // For 1d, show time without minutes if on the hour, otherwise show full time
  if (range === "1d") {
    const minutes = date.getMinutes();
    if (minutes === 0) {
      return date
        .toLocaleTimeString("en-US", {
          hour: "2-digit",
          hour12: false,
        })
        .replace(":00", "");
    }
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // For 1w, show date format (e.g., "Mon 3")
  if (range === "1w") {
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const day = date.getDate();
    return `${weekday} ${day}`;
  }

  // For 1m, show date format (e.g., "Jan 3")
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function generateMockData(
  range: TimeRange,
  team1Price: number,
  team2Price: number
): PricePoint[] {
  const now = Date.now();
  const points: PricePoint[] = [];

  let duration: number;
  let interval: number;

  switch (range) {
    case "1h":
      duration = 60 * 60 * 1000; // 1 hour
      interval = 5 * 60 * 1000; // 5 min intervals (12 points)
      break;
    case "3h":
      duration = 3 * 60 * 60 * 1000; // 3 hours
      interval = 10 * 60 * 1000; // 10 min intervals (18 points)
      break;
    case "1d":
      duration = 24 * 60 * 60 * 1000; // 24 hours
      interval = 60 * 60 * 1000; // 1 hour intervals (24 points)
      break;
    case "1w":
      duration = 7 * 24 * 60 * 60 * 1000; // 7 days
      interval = 6 * 60 * 60 * 1000; // 6 hour intervals (28 points)
      break;
    case "1m":
      duration = 30 * 24 * 60 * 60 * 1000; // 30 days
      interval = 24 * 60 * 60 * 1000; // 1 day intervals (30 points)
      break;
    default:
      duration = 60 * 60 * 1000;
      interval = 5 * 60 * 1000;
  }

  const numPoints = Math.floor(duration / interval);

  // Start with some historical prices that drift to current
  let t1 = team1Price + (Math.random() - 0.5) * 0.3;
  let t2 = team2Price + (Math.random() - 0.5) * 0.3;

  for (let i = 0; i < numPoints; i++) {
    const timestamp = now - duration + i * interval;

    // Add some random walk with mean reversion toward current price
    const drift1 = (team1Price - t1) * 0.02;
    const drift2 = (team2Price - t2) * 0.02;

    t1 += drift1 + (Math.random() - 0.5) * 0.08;
    t2 += drift2 + (Math.random() - 0.5) * 0.08;

    // Clamp values
    t1 = Math.max(0.05, Math.min(0.95, t1));
    t2 = Math.max(0.05, Math.min(0.95, t2));

    points.push({
      timestamp,
      team1Price: t1,
      team2Price: t2,
    });
  }

  // Ensure last point is current price
  if (points.length > 0) {
    points[points.length - 1].team1Price = team1Price;
    points[points.length - 1].team2Price = team2Price;
  }

  return points;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: number;
  team1Name: string;
  team2Name: string;
  range: TimeRange;
}

function CustomTooltip({
  active,
  payload,
  label,
  team1Name,
  team2Name,
}: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a1220]/95 backdrop-blur-md p-3 shadow-xl">
      <p className="text-xs text-white/60 mb-2">
        {new Date(label).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </p>
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-xs font-medium text-white/80">
                {p.dataKey === "team1Price" ? team1Name : team2Name}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-white">
              {p.value.toFixed(1)}¢
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PriceChart({
  team1Name,
  team2Name,
  team1Price,
  team2Price,
  team1TokenId,
  team2TokenId,
}: PriceChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1h");
  const [isLoading, setIsLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [useMockData, setUseMockData] = useState(false);

  // Fetch price history from API
  // Memoize to prevent unnecessary recreations
  const fetchPriceHistory = useCallback(async (): Promise<ApiPricePoint[] | null> => {
    // If no token IDs provided, fall back to mock data
    if (!team1TokenId || !team2TokenId) {
      setUseMockData(true);
      return null;
    }

    try {
      const url = new URL(`${API_CONFIG.baseUrl}/price-history/dual`);
      url.searchParams.set("token1Id", team1TokenId);
      url.searchParams.set("token2Id", team2TokenId);
      url.searchParams.set("timeRange", selectedRange);

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.warn("Failed to fetch price history, falling back to mock data");
        setUseMockData(true);
        return null;
      }

      const data = await response.json();

      if (!data.history || data.history.length === 0) {
        setUseMockData(true);
        return null;
      }

      setUseMockData(false);
      return data.history as ApiPricePoint[];
    } catch (error) {
      console.warn("Error fetching price history:", error);
      setUseMockData(true);
      return null;
    }
  }, [team1TokenId, team2TokenId, selectedRange]);

  // Memoize mock data generation to avoid recalculation
  const generateMockDataMemo = useCallback(
    (range: TimeRange) => generateMockData(range, team1Price, team2Price),
    [team1Price, team2Price]
  );

  useEffect(() => {
    setIsLoading(true);

    const loadData = async () => {
      const apiData = await fetchPriceHistory();

      if (apiData && apiData.length > 0) {
        setPriceHistory(apiData);
      } else {
        // Fall back to mock data
        const mockData = generateMockDataMemo(selectedRange);
        setPriceHistory(mockData);
      }

      setIsLoading(false);
    };

    loadData();
  }, [selectedRange, fetchPriceHistory, generateMockDataMemo]);

  const chartData = useMemo(() => {
    return priceHistory.map((point) => ({
      ...point,
      // Convert to cents for display (price is 0-1, display as 0-100)
      team1Display: point.team1Price * 100,
      team2Display: point.team2Price * 100,
    }));
  }, [priceHistory]);

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    let min = Infinity;
    let max = -Infinity;

    chartData.forEach((point) => {
      min = Math.min(min, point.team1Display, point.team2Display);
      max = Math.max(max, point.team1Display, point.team2Display);
    });

    // Add padding
    const padding = (max - min) * 0.15;
    return [Math.max(0, min - padding), Math.min(100, max + padding)];
  }, [chartData]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a1220]/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 border-b border-white/5">
        {/* Legend */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-sm font-medium text-white/80 uppercase">
              {team1Name}
            </span>
            <span className="font-mono text-sm font-bold text-amber-400">
              {(team1Price * 100).toFixed(1)}¢
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-sm font-medium text-white/80 uppercase">
              {team2Name}
            </span>
            <span className="font-mono text-sm font-bold text-red-400">
              {(team2Price * 100).toFixed(1)}¢
            </span>
          </div>
          {useMockData && (
            <span className="text-xs text-white/30 italic">(simulated)</span>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200",
                selectedRange === range.value
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-[280px] sm:h-[320px] p-2 sm:p-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key={selectedRange}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <defs>
                    <linearGradient
                      id="team1Gradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                      <stop
                        offset="100%"
                        stopColor="#fbbf24"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="team2Gradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#f87171" stopOpacity={0.3} />
                      <stop
                        offset="100%"
                        stopColor="#f87171"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(t) => formatTime(t, selectedRange)}
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    minTickGap={40}
                  />

                  <YAxis
                    domain={yDomain}
                    tickFormatter={(v) => `${v.toFixed(0)}¢`}
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    width={45}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip
                        team1Name={team1Name}
                        team2Name={team2Name}
                        range={selectedRange}
                      />
                    }
                  />

                  {/* 50% reference line */}
                  <ReferenceLine
                    y={50}
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="5 5"
                  />

                  {/* Team 1 Line */}
                  <Line
                    type="stepAfter"
                    dataKey="team1Display"
                    name="team1Price"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#fbbf24",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />

                  {/* Team 2 Line */}
                  <Line
                    type="stepAfter"
                    dataKey="team2Display"
                    name="team2Price"
                    stroke="#f87171"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#f87171",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
