"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@rekon/ui";
import { API_CONFIG } from "@rekon/config";
import { formatVolume } from "@rekon/utils";

interface SearchResult {
  id: string;
  question: string;
  slug?: string;
  conditionId?: string;
  imageUrl?: string;
  game?: string;
  volume?: number;
  liquidity?: number;
  isResolved?: boolean;
  category?: string;
  subcategory?: string;
}

/**
 * Detects if a market belongs to one of the 4 esports games we support.
 */
function detectEsportsGame(
  market: SearchResult
): "cs2" | "lol" | "dota2" | "valorant" | null {
  const category = (market.category || "").toLowerCase();
  const subcategory = (market.subcategory || "").toLowerCase();
  const question = (market.question || "").toLowerCase();

  // Check League of Legends FIRST to avoid false matches
  if (
    category.includes("league of legends") ||
    category.includes("league-of-legends") ||
    subcategory.includes("league of legends") ||
    subcategory.includes("league-of-legends") ||
    question.includes("league of legends") ||
    question.includes(" lol ") ||
    question.startsWith("lol:") ||
    question.includes("lck") ||
    question.includes("lpl") ||
    question.includes("lec") ||
    question.includes("worlds") ||
    question.includes("msi")
  ) {
    return "lol";
  }

  // Check Dota 2
  if (
    category.includes("dota 2") ||
    category.includes("dota2") ||
    category.includes("dota-2") ||
    subcategory.includes("dota 2") ||
    subcategory.includes("dota2") ||
    subcategory.includes("dota-2") ||
    question.includes("dota 2") ||
    question.includes("dota2") ||
    (question.includes("dota") && !question.includes("anecdota"))
  ) {
    return "dota2";
  }

  // Check Valorant
  if (
    category.includes("valorant") ||
    subcategory.includes("valorant") ||
    question.includes("valorant") ||
    question.includes("vct") ||
    question.includes("champions") ||
    question.includes("masters") ||
    question.includes("challengers")
  ) {
    return "valorant";
  }

  // Check CS2
  if (
    category.includes("counter-strike") ||
    category.includes("cs2") ||
    category.includes("cs:go") ||
    category.includes("csgo") ||
    subcategory.includes("counter-strike") ||
    subcategory.includes("cs2") ||
    subcategory.includes("cs:go") ||
    subcategory.includes("csgo") ||
    question.includes("cs2") ||
    question.includes("cs:go") ||
    question.includes("csgo") ||
    question.includes("counter-strike") ||
    question.includes("counter strike")
  ) {
    return "cs2";
  }

  return null;
}

/**
 * Filters out child markets (Game 1, Map 2, etc.) and outrights.
 * Only keeps main match markets.
 */
function isGameMarket(market: SearchResult): boolean {
  const q = market.question.toLowerCase();

  // EXCLUDE child markets
  const isChildMarket =
    q.includes("game 1") ||
    q.includes("game 2") ||
    q.includes("game 3") ||
    q.includes("map 1") ||
    q.includes("map 2") ||
    q.includes("map 3") ||
    /\bgame\s*\d+\s*winner/i.test(q) ||
    /\bmap\s*\d+\s*winner/i.test(q) ||
    q.includes("games total") ||
    q.includes("total games");

  if (isChildMarket) {
    return false;
  }

  // EXCLUDE outrights
  const outrightPhrases = [
    "win the lpl",
    "win the lec",
    "win the lcs",
    "win worlds",
    "win the split",
    "win the season",
    "to win lpl",
    "to win lec",
    "to win lcs",
    "to win worlds",
    "outright",
    "winner of worlds",
    "champion",
    "season winner",
  ];
  const looksLikeOutright = outrightPhrases.some((phrase) =>
    q.includes(phrase)
  );

  if (looksLikeOutright) {
    return false;
  }

  // Include markets with "vs" pattern (main matches)
  const hasVsPattern =
    q.includes(" vs ") ||
    q.includes(" vs. ") ||
    q.includes(" vs\n") ||
    q.includes(" vs\t");

  // Include best-of notation
  const hasBestOf = /\(bo\d+\)/i.test(q);

  return hasVsPattern || hasBestOf;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const url = new URL(`${API_CONFIG.baseUrl}/search`);
      url.searchParams.set("q", searchQuery.trim());
      url.searchParams.set("limit_per_type", "20");

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Polymarket Gamma API returns: { events: [...], tags: [...], profiles: [...], pagination: {...} }
      // Each event has a markets array - we need to extract and flatten all markets
      const searchResults: SearchResult[] = [];

      if (data?.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          if (event.markets && Array.isArray(event.markets)) {
            for (const market of event.markets) {
              // Use event image if market doesn't have one
              const imageUrl =
                market.imageOptimized?.imageUrlOptimized ||
                market.image ||
                event.imageOptimized?.imageUrlOptimized ||
                event.image;

              // Extract volume/liquidity - handle both string and number types
              const volume =
                typeof market.volumeNum === "number"
                  ? market.volumeNum
                  : typeof market.volume === "string"
                  ? parseFloat(market.volume) || 0
                  : market.volume24hr || 0;

              const liquidity =
                typeof market.liquidityNum === "number"
                  ? market.liquidityNum
                  : typeof market.liquidity === "string"
                  ? parseFloat(market.liquidity) || 0
                  : market.liquidityClob || market.liquidityAmm || 0;

              const result: SearchResult = {
                id: market.id || market.conditionId || "",
                question: market.question || "",
                slug: market.slug,
                conditionId: market.conditionId || market.id,
                imageUrl: imageUrl,
                game: market.gameId || event.gameId,
                volume: volume,
                liquidity: liquidity,
                isResolved: market.closed || false,
                category: market.categories?.[0]?.label || event.category,
                subcategory: market.subcategory || event.subcategory,
              };

              // Filter: Only include esports game markets (CS2, LoL, Dota 2, Valorant)
              const detectedGame = detectEsportsGame(result);
              if (!detectedGame) {
                continue; // Skip non-esports markets
              }

              // Filter: Only include main match markets (exclude child markets and outrights)
              if (!isGameMarket(result)) {
                continue; // Skip child markets and outrights
              }

              // Update game field with detected game
              result.game = detectedGame;

              searchResults.push(result);
            }
          }
        }
      }

      // Limit results to 20
      setResults(searchResults.slice(0, 20));
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setLoading(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleResultClick(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    const identifier = result.slug || result.conditionId || result.id;
    router.push(`/markets/${identifier}`);
    onClose();
  };

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-16 sm:pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 sm:mx-6 rounded-xl border border-white/10 bg-[#121A30] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search markets..."
            className="flex-1 bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-white/60">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Searching...</span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-white/60">No markets found</p>
              <p className="mt-1 text-xs text-white/40">
                Try a different search term
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-white/5 transition-colors",
                    selectedIndex === index && "bg-white/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {result.imageUrl && (
                      <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded border border-white/10 bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.imageUrl}
                          alt={result.question}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white truncate">
                          {result.question}
                        </h3>
                        {result.isResolved && (
                          <span className="shrink-0 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-medium text-orange-300 border border-orange-500/40">
                            Resolved
                          </span>
                        )}
                      </div>
                      {(result.volume || result.liquidity) && (
                        <div className="mt-1 flex items-center gap-3 text-[10px] text-white/50">
                          {result.volume && (
                            <span>Vol {formatVolume(result.volume)}</span>
                          )}
                          {result.liquidity && (
                            <span>Liq {formatVolume(result.liquidity)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-white/60">
                Start typing to search markets
              </p>
              <p className="mt-1 text-xs text-white/40">
                Search by team name, event, or market question
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
