import { describe, it, expect } from "vitest";
import type {
  EsportsTeamStats,
  MatchHistory,
  LiveMatchState,
  ConfidenceBreakdown,
} from "@rekon/types";
import {
  computeRecentFormScore,
  computeHeadToHeadScore,
  computeMapAdvantageScore,
  computeRosterStabilityScore,
  computeMarketOddsScore,
  computeLivePerformanceScore,
  computeRecommendation,
  generateFallbackReasoning,
  type TeamData,
  type RecommendationInput,
} from "./recommendation-engine";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockTeamStats(overrides: Partial<EsportsTeamStats> = {}): EsportsTeamStats {
  return {
    teamId: "team-1",
    teamName: "Team Alpha",
    winRate: 55,
    recentForm: 60,
    rosterStability: 70,
    totalMatches: 50,
    ...overrides,
  };
}

function createMockMatchHistory(overrides: Partial<MatchHistory> = {}): MatchHistory {
  return {
    matchId: "match-1",
    opponent: "Team Beta",
    result: "win",
    score: "2-1",
    date: new Date().toISOString(),
    tournament: "Major Championship",
    ...overrides,
  };
}

function createMockLiveMatchState(
  overrides: Partial<LiveMatchState> = {}
): LiveMatchState {
  return {
    seriesId: "series-1",
    state: "ongoing",
    format: "bo3",
    currentGame: 2,
    score: { team1: 1, team2: 0 },
    games: [
      {
        gameNumber: 1,
        state: "finished",
        winnerTeamName: "Team Alpha",
      },
      {
        gameNumber: 2,
        state: "ongoing",
        stats: {
          team1: { teamName: "Team Alpha", kills: 10, deaths: 5, netWorth: 50000 },
          team2: { teamName: "Team Beta", kills: 5, deaths: 10, netWorth: 40000 },
        },
      },
    ],
    lastUpdated: new Date().toISOString(),
    valid: true,
    ...overrides,
  };
}

function createMockTeamData(overrides: Partial<TeamData> = {}): TeamData {
  return {
    name: "Team Alpha",
    stats: createMockTeamStats(),
    matches: [],
    price: 0.55,
    ...overrides,
  };
}

// ============================================================================
// computeRecentFormScore Tests
// ============================================================================

describe("computeRecentFormScore", () => {
  it("returns default score when no stats or matches", () => {
    const score = computeRecentFormScore(null, []);
    expect(score).toBe(50); // Default score
  });

  it("uses recentForm from stats when available", () => {
    const stats = createMockTeamStats({ recentForm: 75 });
    const score = computeRecentFormScore(stats, []);
    expect(score).toBe(75);
  });

  it("clamps score to 0-100 range", () => {
    const highStats = createMockTeamStats({ recentForm: 150 });
    const lowStats = createMockTeamStats({ recentForm: -20 });

    expect(computeRecentFormScore(highStats, [])).toBeLessThanOrEqual(100);
    expect(computeRecentFormScore(lowStats, [])).toBeGreaterThanOrEqual(0);
  });

  it("calculates from match history when no recentForm in stats", () => {
    const stats = createMockTeamStats({ recentForm: undefined as unknown as number });
    const matches = [
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "loss" }),
      createMockMatchHistory({ result: "loss" }),
    ];

    const score = computeRecentFormScore(stats, matches);
    // 3 wins out of 5 with weighting (more recent wins = higher weight)
    // Score should be between 40-90 depending on weighting
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThanOrEqual(90);
  });

  it("falls back to winRate when insufficient matches and no recentForm", () => {
    const stats = createMockTeamStats({
      recentForm: undefined as unknown as number,
      winRate: 65,
    });
    const matches = [createMockMatchHistory(), createMockMatchHistory()]; // Only 2

    const score = computeRecentFormScore(stats, matches);
    expect(score).toBe(65); // Falls back to winRate
  });
});

// ============================================================================
// computeHeadToHeadScore Tests
// ============================================================================

describe("computeHeadToHeadScore", () => {
  it("returns 50 (neutral) for no H2H matches", () => {
    const score = computeHeadToHeadScore([], "Team Alpha");
    expect(score).toBe(50);
  });

  it("returns high score for winning H2H record", () => {
    const h2hMatches = [
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "loss" }),
    ];

    const score = computeHeadToHeadScore(h2hMatches, "Team Alpha");
    expect(score).toBe(75); // 3 wins out of 4 = 75%
  });

  it("returns low score for losing H2H record", () => {
    const h2hMatches = [
      createMockMatchHistory({ result: "loss" }),
      createMockMatchHistory({ result: "loss" }),
      createMockMatchHistory({ result: "loss" }),
      createMockMatchHistory({ result: "win" }),
    ];

    const score = computeHeadToHeadScore(h2hMatches, "Team Alpha");
    expect(score).toBe(25); // 1 win out of 4 = 25%
  });

  it("pulls towards 50 with limited data", () => {
    const h2hMatches = [
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
    ];

    const score = computeHeadToHeadScore(h2hMatches, "Team Alpha");
    // 100% win rate but only 2 matches, should be pulled towards 50
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(50);
  });
});

// ============================================================================
// computeMapAdvantageScore Tests
// ============================================================================

describe("computeMapAdvantageScore", () => {
  it("returns default score when no stats", () => {
    const score = computeMapAdvantageScore(null);
    expect(score).toBe(50);
  });

  it("uses mapWinRate when available", () => {
    const stats = createMockTeamStats({ mapWinRate: 70 });
    const score = computeMapAdvantageScore(stats);
    expect(score).toBe(70);
  });

  it("falls back to winRate when no mapWinRate", () => {
    const stats = createMockTeamStats({ winRate: 60 });
    const score = computeMapAdvantageScore(stats);
    expect(score).toBe(60);
  });

  it("clamps to 0-100 range", () => {
    const highStats = createMockTeamStats({ mapWinRate: 150 });
    const lowStats = createMockTeamStats({ mapWinRate: -20 });

    expect(computeMapAdvantageScore(highStats)).toBeLessThanOrEqual(100);
    expect(computeMapAdvantageScore(lowStats)).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// computeRosterStabilityScore Tests
// ============================================================================

describe("computeRosterStabilityScore", () => {
  it("returns default score when no stats", () => {
    const score = computeRosterStabilityScore(null);
    expect(score).toBe(70); // Default moderate stability
  });

  it("uses rosterStability from stats when available", () => {
    const stats = createMockTeamStats({ rosterStability: 90 });
    const score = computeRosterStabilityScore(stats);
    expect(score).toBe(90);
  });

  it("clamps to 0-100 range", () => {
    const highStats = createMockTeamStats({ rosterStability: 150 });
    expect(computeRosterStabilityScore(highStats)).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// computeMarketOddsScore Tests
// ============================================================================

describe("computeMarketOddsScore", () => {
  it("converts price to score correctly", () => {
    expect(computeMarketOddsScore(0.5)).toBe(50);
    expect(computeMarketOddsScore(0.75)).toBe(75);
    expect(computeMarketOddsScore(0.25)).toBe(25);
  });

  it("clamps to 0-100 range", () => {
    expect(computeMarketOddsScore(1.5)).toBe(100);
    expect(computeMarketOddsScore(-0.5)).toBe(0);
  });

  it("handles edge cases", () => {
    expect(computeMarketOddsScore(0)).toBe(0);
    expect(computeMarketOddsScore(1)).toBe(100);
  });
});

// ============================================================================
// computeLivePerformanceScore Tests
// ============================================================================

describe("computeLivePerformanceScore", () => {
  it("returns 50 (neutral) when no live state", () => {
    const score = computeLivePerformanceScore(undefined, "Team Alpha");
    expect(score).toBe(50);
  });

  it("returns 50 when match not ongoing", () => {
    const liveState = createMockLiveMatchState({ state: "not_started" });
    const score = computeLivePerformanceScore(liveState, "Team Alpha");
    expect(score).toBe(50);
  });

  it("returns higher score when team is winning series", () => {
    const liveState = createMockLiveMatchState({
      state: "ongoing",
      score: { team1: 2, team2: 0 },
    });

    const score = computeLivePerformanceScore(liveState, "Team Alpha");
    expect(score).toBeGreaterThan(50);
  });

  it("factors in current game K/D advantage", () => {
    const goodKD = createMockLiveMatchState({
      state: "ongoing",
      games: [
        {
          gameNumber: 1,
          state: "ongoing",
          stats: {
            team1: { teamName: "Team Alpha", kills: 20, deaths: 5, netWorth: 50000 },
            team2: { teamName: "Team Beta", kills: 5, deaths: 20, netWorth: 40000 },
          },
        },
      ],
    });

    const badKD = createMockLiveMatchState({
      state: "ongoing",
      games: [
        {
          gameNumber: 1,
          state: "ongoing",
          stats: {
            team1: { teamName: "Team Alpha", kills: 5, deaths: 20, netWorth: 40000 },
            team2: { teamName: "Team Beta", kills: 20, deaths: 5, netWorth: 50000 },
          },
        },
      ],
    });

    const goodScore = computeLivePerformanceScore(goodKD, "Team Alpha");
    const badScore = computeLivePerformanceScore(badKD, "Team Alpha");

    expect(goodScore).toBeGreaterThan(badScore);
  });

  it("clamps score to 0-100 range", () => {
    const extremeState = createMockLiveMatchState({
      score: { team1: 10, team2: 0 },
    });

    const score = computeLivePerformanceScore(extremeState, "Team Alpha");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// computeRecommendation Tests
// ============================================================================

describe("computeRecommendation", () => {
  it("recommends team with better stats", () => {
    const team1 = createMockTeamData({
      name: "Strong Team",
      stats: createMockTeamStats({ winRate: 70, recentForm: 75 }),
      price: 0.6,
    });

    const team2 = createMockTeamData({
      name: "Weak Team",
      stats: createMockTeamStats({ winRate: 40, recentForm: 35 }),
      price: 0.4,
    });

    const input: RecommendationInput = {
      team1,
      team2,
      h2hMatches: [],
    };

    const result = computeRecommendation(input);
    expect(result.recommendedPick).toBe("Strong Team");
    expect(result.otherTeam).toBe("Weak Team");
  });

  it("returns confidence level based on score difference", () => {
    const team1 = createMockTeamData({
      name: "Team A",
      stats: createMockTeamStats({ winRate: 80, recentForm: 85 }),
      price: 0.8,
    });

    const team2 = createMockTeamData({
      name: "Team B",
      stats: createMockTeamStats({ winRate: 30, recentForm: 25 }),
      price: 0.2,
    });

    const result = computeRecommendation({ team1, team2, h2hMatches: [] });
    expect(["high", "medium", "low"]).toContain(result.confidence);
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(95);
  });

  it("returns breakdown with all factors", () => {
    const team1 = createMockTeamData();
    const team2 = createMockTeamData({ name: "Team Beta" });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
    });

    expect(result.breakdown).toHaveProperty("recentForm");
    expect(result.breakdown).toHaveProperty("headToHead");
    expect(result.breakdown).toHaveProperty("mapAdvantage");
    expect(result.breakdown).toHaveProperty("rosterStability");
    expect(result.breakdown).toHaveProperty("marketOdds");
  });

  it("includes livePerformance when match is live", () => {
    const team1 = createMockTeamData();
    const team2 = createMockTeamData({ name: "Team Beta" });
    const liveState = createMockLiveMatchState();

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
      liveState,
    });

    expect(result.isLive).toBe(true);
    expect(result.breakdown.livePerformance).toBeDefined();
  });

  it("returns exactly 3 short reasoning bullets", () => {
    const team1 = createMockTeamData();
    const team2 = createMockTeamData({ name: "Team Beta" });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
    });

    expect(result.shortReasoning).toHaveLength(3);
    result.shortReasoning.forEach((bullet) => {
      expect(typeof bullet).toBe("string");
      expect(bullet.length).toBeGreaterThan(0);
    });
  });

  it("is deterministic - same input produces same output", () => {
    const team1 = createMockTeamData();
    const team2 = createMockTeamData({ name: "Team Beta" });
    const input: RecommendationInput = { team1, team2, h2hMatches: [] };

    const result1 = computeRecommendation(input);
    const result2 = computeRecommendation(input);

    expect(result1.recommendedPick).toBe(result2.recommendedPick);
    expect(result1.confidenceScore).toBe(result2.confidenceScore);
    expect(result1.breakdown).toEqual(result2.breakdown);
  });

  it("handles null stats gracefully", () => {
    const team1 = createMockTeamData({ stats: null });
    const team2 = createMockTeamData({ name: "Team Beta", stats: null });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
    });

    // Should still produce a result using defaults
    expect(result.recommendedPick).toBeDefined();
    expect(result.confidenceScore).toBeGreaterThan(0);
  });

  it("considers H2H in recommendation", () => {
    // Team 2 has better stats but Team 1 dominates H2H
    const team1 = createMockTeamData({
      name: "H2H King",
      stats: createMockTeamStats({ winRate: 50, recentForm: 50 }),
      price: 0.4,
    });

    const team2 = createMockTeamData({
      name: "Stats Leader",
      stats: createMockTeamStats({ winRate: 60, recentForm: 60 }),
      price: 0.6,
    });

    const h2hMatches = [
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
      createMockMatchHistory({ result: "win" }),
    ];

    const result = computeRecommendation({ team1, team2, h2hMatches });

    // H2H advantage should factor into recommendation
    expect(result.breakdown.headToHead).toBe(100); // 4-0 = 100%
  });
});

// ============================================================================
// generateFallbackReasoning Tests
// ============================================================================

describe("generateFallbackReasoning", () => {
  it("generates reasoning mentioning the pick", () => {
    const breakdown: ConfidenceBreakdown = {
      recentForm: 70,
      headToHead: 60,
      mapAdvantage: 55,
      rosterStability: 70,
      marketOdds: 65,
    };

    const reasoning = generateFallbackReasoning("Team Alpha", breakdown, false);
    expect(reasoning).toContain("Team Alpha");
  });

  it("mentions strongest factor", () => {
    const breakdown: ConfidenceBreakdown = {
      recentForm: 85, // Strongest
      headToHead: 50,
      mapAdvantage: 50,
      rosterStability: 50,
      marketOdds: 50,
    };

    const reasoning = generateFallbackReasoning("Team Alpha", breakdown, false);
    expect(reasoning.toLowerCase()).toContain("form");
  });

  it("mentions market sentiment when strong", () => {
    const breakdown: ConfidenceBreakdown = {
      recentForm: 50,
      headToHead: 50,
      mapAdvantage: 50,
      rosterStability: 50,
      marketOdds: 75,
    };

    const reasoning = generateFallbackReasoning("Team Alpha", breakdown, false);
    expect(reasoning.toLowerCase()).toContain("market");
  });

  it("mentions live performance when match is live", () => {
    const breakdown: ConfidenceBreakdown = {
      recentForm: 60,
      headToHead: 60,
      mapAdvantage: 60,
      rosterStability: 60,
      marketOdds: 60,
      livePerformance: 75,
    };

    const reasoning = generateFallbackReasoning("Team Alpha", breakdown, true);
    expect(reasoning.toLowerCase()).toContain("live");
  });

  it("returns generic message when no strong factors", () => {
    const breakdown: ConfidenceBreakdown = {
      recentForm: 55,
      headToHead: 50,
      mapAdvantage: 52,
      rosterStability: 50,
      marketOdds: 48,
    };

    const reasoning = generateFallbackReasoning("Team Alpha", breakdown, false);
    expect(reasoning.length).toBeGreaterThan(20);
    expect(reasoning).toContain("Team Alpha");
  });

  it("handles all factors below threshold gracefully", () => {
    const breakdown: ConfidenceBreakdown = {
      recentForm: 50,
      headToHead: 50,
      mapAdvantage: 50,
      rosterStability: 50,
      marketOdds: 50,
    };

    const reasoning = generateFallbackReasoning("Team Alpha", breakdown, false);
    expect(reasoning.length).toBeGreaterThan(0);
    expect(reasoning).toContain("Team Alpha");
  });
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe("Recommendation Engine Edge Cases", () => {
  it("handles teams with identical stats", () => {
    const team1 = createMockTeamData({ name: "Team A" });
    const team2 = createMockTeamData({ name: "Team B" });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
    });

    // Should still make a recommendation (tie-breaker: team1)
    expect(result.recommendedPick).toBeDefined();
    expect(result.confidence).toBe("low"); // Low confidence for even matchup
  });

  it("handles extreme market odds (favorites)", () => {
    const team1 = createMockTeamData({
      name: "Heavy Favorite",
      price: 0.95,
      stats: createMockTeamStats({ winRate: 90, recentForm: 90 }),
    });

    const team2 = createMockTeamData({
      name: "Heavy Underdog",
      price: 0.05,
      stats: createMockTeamStats({ winRate: 20, recentForm: 20 }),
    });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
    });

    expect(result.recommendedPick).toBe("Heavy Favorite");
    expect(result.confidence).toBe("high");
  });

  it("handles missing optional fields in live state", () => {
    const liveState: LiveMatchState = {
      seriesId: "series-1",
      state: "ongoing",
      score: { team1: 0, team2: 0 },
      games: [],
      lastUpdated: new Date().toISOString(),
    };

    const team1 = createMockTeamData();
    const team2 = createMockTeamData({ name: "Team Beta" });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
      liveState,
    });

    expect(result.isLive).toBe(true);
    expect(result.breakdown.livePerformance).toBeDefined();
  });

  it("handles empty match history arrays", () => {
    const team1 = createMockTeamData({ matches: [] });
    const team2 = createMockTeamData({ name: "Team Beta", matches: [] });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
    });

    expect(result.recommendedPick).toBeDefined();
  });

  it("weights live performance heavily when match is ongoing", () => {
    // Team 2 has better historical stats but Team 1 is crushing live
    const team1 = createMockTeamData({
      name: "Live Crusher",
      stats: createMockTeamStats({ winRate: 40, recentForm: 40 }),
      price: 0.4,
    });

    const team2 = createMockTeamData({
      name: "Historical King",
      stats: createMockTeamStats({ winRate: 70, recentForm: 70 }),
      price: 0.6,
    });

    const liveState = createMockLiveMatchState({
      score: { team1: 2, team2: 0 },
      games: [
        {
          gameNumber: 3,
          state: "ongoing",
          stats: {
            team1: { teamName: "Live Crusher", kills: 25, deaths: 5, netWorth: 80000 },
            team2: { teamName: "Historical King", kills: 5, deaths: 25, netWorth: 30000 },
          },
        },
      ],
    });

    const result = computeRecommendation({
      team1,
      team2,
      h2hMatches: [],
      liveState,
    });

    // Live performance should boost Team 1
    expect(result.breakdown.livePerformance).toBeGreaterThan(50);
  });
});
