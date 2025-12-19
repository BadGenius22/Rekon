import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type {
  GridTeam,
  GridSeries,
  GridTeamStatistics,
  GridSeriesState,
} from "./types";

// Mock dependencies
var mockRequest: Mock;

vi.mock("graphql-request", () => {
  mockRequest = vi.fn();

  return {
    GraphQLClient: vi.fn().mockImplementation(function () {
      // Support usage with `new GraphQLClient(...)`
      return {
        request: mockRequest,
      };
    }),
    // Minimal gql helper to keep types happy
    gql: (strings: TemplateStringsArray, ...exprs: unknown[]) =>
      strings.reduce((acc, part, idx) => acc + part + (exprs[idx] ?? ""), ""),
  };
});
vi.mock("@rekon/config", () => ({
  GRID_CONFIG: {
    statisticsFeedUrl: "https://api-op.grid.gg/statistics-feed/graphql",
    centralDataUrl: "https://api-op.grid.gg/central-data/graphql",
    liveDataFeedUrl:
      "https://api-op.grid.gg/live-data-feed/series-state/graphql",
    apiKey: "test-api-key",
    offline: false,
    cache: {
      statisticsTtl: 4 * 60 * 60 * 1000,
      seriesDataTtl: 1 * 60 * 60 * 1000,
      teamDataTtl: 24 * 60 * 60 * 1000,
      liveStateTtl: 3 * 1000,
    },
  },
}));

vi.mock("../../utils/sentry", () => ({
  trackGridApiFailure: vi.fn(),
}));

vi.mock("./cache", () => ({
  withCache: vi.fn((_key, _ttl, fetcher) => fetcher()),
  getCacheKey: vi.fn(
    (type, params) => `grid:${type}:${JSON.stringify(params)}`
  ),
}));

import {
  fetchGridLiveSeriesState,
  searchGridTeamsByName,
  findSeriesByTeamNames,
  fetchGridTeamStatistics,
} from "./client";
import { trackGridApiFailure } from "../../utils/sentry";

const trackGridApiFailureMock = trackGridApiFailure as unknown as Mock;

describe("GRID Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchGridLiveSeriesState", () => {
    it("returns live series state when API call succeeds", async () => {
      const mockState: GridSeriesState = {
        valid: true,
        updatedAt: "2024-01-01T12:00:00Z",
        format: "best-of-3",
        started: true,
        finished: false,
        teams: [
          { name: "Team A", won: false },
          { name: "Team B", won: false },
        ],
        games: [
          {
            sequenceNumber: 1,
            teams: [
              {
                name: "Team A",
                players: [
                  {
                    name: "Player1",
                    kills: 5,
                    deaths: 3,
                    netWorth: 10000,
                    money: 2000,
                    position: { x: 100, y: 200 },
                  },
                ],
              },
              {
                name: "Team B",
                players: [
                  {
                    name: "Player2",
                    kills: 3,
                    deaths: 5,
                    netWorth: 8000,
                    money: 1500,
                    position: { x: 300, y: 400 },
                  },
                ],
              },
            ],
          },
        ],
      };

      mockRequest.mockResolvedValueOnce({ seriesState: mockState });

      const result = await fetchGridLiveSeriesState("series-123");

      expect(result).toEqual(mockState);
      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        id: "series-123",
        gameFilter: { started: true, finished: false },
      });
    });

    it("returns null when API call fails", async () => {
      mockRequest.mockRejectedValueOnce(new Error("API Error"));

      const result = await fetchGridLiveSeriesState("series-123");

      expect(result).toBeNull();
      expect(trackGridApiFailureMock).toHaveBeenCalled();
    });

    it("filters to all games when onlyOngoingGames is false", async () => {
      mockRequest.mockResolvedValueOnce({ seriesState: null });

      await fetchGridLiveSeriesState("series-123", false);

      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        id: "series-123",
        gameFilter: {},
      });
    });
  });

  describe("searchGridTeamsByName", () => {
    it("returns exact match when found", async () => {
      const mockTeams: GridTeam[] = [
        { id: "1", name: "Team Liquid" },
        { id: "2", name: "Team SoloMid" },
        { id: "3", name: "Team Envy" },
      ];

      mockRequest.mockResolvedValueOnce({
        teams: {
          edges: mockTeams.map((team) => ({ cursor: "c1", node: team })),
        },
      });

      const result = await searchGridTeamsByName("Team Liquid");

      expect(result).toEqual([mockTeams[0]]);
    });

    it("returns startsWith matches when no exact match", async () => {
      const mockTeams: GridTeam[] = [
        { id: "1", name: "Team Liquid" },
        { id: "2", name: "Team SoloMid" },
        { id: "3", name: "Team Envy" },
      ];

      mockRequest.mockResolvedValueOnce({
        teams: {
          edges: mockTeams.map((team) => ({ cursor: "c1", node: team })),
        },
      });

      const result = await searchGridTeamsByName("Team");

      expect(result.length).toBeGreaterThan(0);
      expect(result.every((t) => t.name.toLowerCase().startsWith("team"))).toBe(
        true
      );
    });

    it("returns contains matches when no startsWith match", async () => {
      const mockTeams: GridTeam[] = [
        { id: "1", name: "Liquid Gaming" },
        { id: "2", name: "SoloMid Esports" },
      ];

      mockRequest.mockResolvedValueOnce({
        teams: {
          edges: mockTeams.map((team) => ({ cursor: "c1", node: team })),
        },
      });

      const result = await searchGridTeamsByName("Liquid");

      expect(result).toEqual([mockTeams[0]]);
    });

    it("returns empty array when no matches found", async () => {
      mockRequest.mockResolvedValueOnce({
        teams: {
          edges: [],
        },
      });

      const result = await searchGridTeamsByName("NonExistent");

      expect(result).toEqual([]);
    });

    it("returns empty array when API call fails", async () => {
      mockRequest.mockRejectedValueOnce(new Error("API Error"));

      const result = await searchGridTeamsByName("Team");

      expect(result).toEqual([]);
      expect(trackGridApiFailureMock).toHaveBeenCalled();
    });
  });

  describe("findSeriesByTeamNames", () => {
    it("returns matching series when found", async () => {
      const mockSeries: GridSeries[] = [
        {
          id: "s1",
          title: { nameShortened: "Team A vs Team B" },
          tournament: { nameShortened: "Tournament 1" },
          startTimeScheduled: "2024-01-15T12:00:00Z",
          format: { name: "Best of 3", nameShortened: "BO3" },
          teams: [
            { baseInfo: { name: "Team A" } },
            { baseInfo: { name: "Team B" } },
          ],
        },
      ];

      mockRequest.mockResolvedValueOnce({
        allSeries: {
          edges: mockSeries.map((series) => ({ cursor: "c1", node: series })),
        },
      });

      const result = await findSeriesByTeamNames("Team A", "Team B");

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].teams.some((t) => t.baseInfo.name === "Team A")).toBe(
        true
      );
      expect(result[0].teams.some((t) => t.baseInfo.name === "Team B")).toBe(
        true
      );
    });

    it("filters by time range", async () => {
      mockRequest.mockResolvedValueOnce({
        allSeries: {
          edges: [],
        },
      });

      await findSeriesByTeamNames("Team A", "Team B", 7, 30);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: expect.objectContaining({
            startTimeScheduled: expect.objectContaining({
              gte: expect.any(String),
              lte: expect.any(String),
            }),
          }),
        })
      );
    });

    it("returns empty array when no matches found", async () => {
      mockRequest.mockResolvedValueOnce({
        allSeries: {
          edges: [],
        },
      });

      const result = await findSeriesByTeamNames("Team A", "Team B");

      expect(result).toEqual([]);
    });
  });

  describe("fetchGridTeamStatistics", () => {
    it("returns team statistics when API call succeeds", async () => {
      const mockStats: GridTeamStatistics = {
        id: "team-123",
        aggregationSeriesIds: ["s1", "s2"],
        series: {
          count: 10,
          kills: { sum: 500, min: 20, max: 60, avg: 50 },
          deaths: { sum: 400, min: 15, max: 55, avg: 40 },
        },
        game: {
          count: 25,
          wins: {
            value: true,
            count: 15,
            percentage: 60,
            streak: { min: 0, max: 5, current: 2 },
          },
          losses: {
            value: false,
            count: 10,
            percentage: 40,
            streak: { min: 0, max: 3, current: -1 },
          },
        },
        segment: [],
      };

      mockRequest.mockResolvedValueOnce({ teamStatistics: mockStats });

      const result = await fetchGridTeamStatistics("team-123");

      expect(result).toEqual(mockStats);
      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        teamId: "team-123",
        filter: { timeWindow: "LAST_3_MONTHS" },
      });
    });

    it("uses custom time window when provided", async () => {
      mockRequest.mockResolvedValueOnce({ teamStatistics: null });

      await fetchGridTeamStatistics("team-123", "LAST_MONTH" as any);

      expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
        teamId: "team-123",
        filter: { timeWindow: "LAST_MONTH" },
      });
    });

    it("returns null when API call fails", async () => {
      mockRequest.mockRejectedValueOnce(new Error("API Error"));

      const result = await fetchGridTeamStatistics("team-123");

      expect(result).toBeNull();
      expect(trackGridApiFailureMock).toHaveBeenCalled();
    });
  });
});
