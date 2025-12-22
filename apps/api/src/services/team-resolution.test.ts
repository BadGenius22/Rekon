import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock the dependencies
vi.mock("@rekon/utils", () => ({
  normalizeTeamName: vi.fn((name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/\s*(gaming|esports|esport|team|clan|org)\s*/gi, " ")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  ),
  findTeamByAlias: vi.fn(),
  CS2_TEAM_ALIASES: {
    faze: {
      gridName: "FaZe Clan",
      gridId: "123",
      aliases: ["faze clan", "faze esports"],
    },
    "natus vincere": {
      gridName: "Natus Vincere",
      gridId: "456",
      aliases: ["navi", "na'vi"],
    },
    liquid: {
      gridName: "Team Liquid",
      gridId: "",
      aliases: ["team liquid", "tl"],
    },
  },
}));

vi.mock("../adapters/grid/team-index", () => ({
  searchTeamIndex: vi.fn(),
}));

vi.mock("../adapters/grid/client", () => ({
  searchGridTeamsByName: vi.fn(),
}));

vi.mock("../adapters/grid/cache", () => ({
  withCache: vi.fn((_key: string, _ttl: number, fetcher: () => Promise<unknown>) =>
    fetcher()
  ),
  getCacheKey: vi.fn(
    (type: string, params: Record<string, string>) =>
      `grid:${type}:${JSON.stringify(params)}`
  ),
}));

import {
  resolveTeamName,
  resolveMarketTeams,
  resolveTeamNames,
  getResolutionStats,
} from "./team-resolution";
import { findTeamByAlias } from "@rekon/utils";
import { searchTeamIndex } from "../adapters/grid/team-index";
import { searchGridTeamsByName } from "../adapters/grid/client";

describe("Team Resolution Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveTeamName", () => {
    it("resolves team from alias table (Tier 1)", async () => {
      (findTeamByAlias as Mock).mockReturnValue({
        gridName: "FaZe Clan",
        gridId: "123",
        aliases: ["faze clan", "faze esports"],
      });

      const result = await resolveTeamName("FaZe Clan");

      expect(result).not.toBeNull();
      expect(result?.gridId).toBe("123");
      expect(result?.gridName).toBe("FaZe Clan");
      expect(result?.confidence).toBe("exact");
      expect(result?.source).toBe("alias");
    });

    it("resolves team from index with high confidence (Tier 2)", async () => {
      (findTeamByAlias as Mock).mockReturnValue(null);
      (searchTeamIndex as Mock).mockResolvedValue([
        {
          entry: {
            gridId: "789",
            name: "Complexity Gaming",
            normalizedName: "complexity",
            aliases: [],
            game: "cs2",
          },
          score: 0.1,
        },
      ]);

      const result = await resolveTeamName("Complexity");

      expect(result).not.toBeNull();
      expect(result?.gridId).toBe("789");
      expect(result?.gridName).toBe("Complexity Gaming");
      expect(result?.confidence).toBe("high");
      expect(result?.source).toBe("index");
      expect(result?.score).toBe(0.1);
    });

    it("resolves team from index with medium confidence", async () => {
      (findTeamByAlias as Mock).mockReturnValue(null);
      (searchTeamIndex as Mock).mockResolvedValue([
        {
          entry: {
            gridId: "999",
            name: "Some Team",
            normalizedName: "some",
            aliases: [],
            game: "cs2",
          },
          score: 0.35,
        },
      ]);

      const result = await resolveTeamName("Somee Team");

      expect(result).not.toBeNull();
      expect(result?.confidence).toBe("medium");
      expect(result?.source).toBe("index");
    });

    it("falls back to API search (Tier 3)", async () => {
      (findTeamByAlias as Mock).mockReturnValue(null);
      (searchTeamIndex as Mock).mockResolvedValue([
        {
          entry: {
            gridId: "lowconf",
            name: "Low Conf Team",
            normalizedName: "low",
            aliases: [],
            game: "cs2",
          },
          score: 0.8, // Low confidence - will be rejected
        },
      ]);
      (searchGridTeamsByName as Mock).mockResolvedValue([
        { id: "api-123", name: "API Found Team" },
      ]);

      const result = await resolveTeamName("Unknown Team");

      expect(result).not.toBeNull();
      expect(result?.gridId).toBe("api-123");
      expect(result?.gridName).toBe("API Found Team");
      expect(result?.source).toBe("api");
    });

    it("returns null when no match found anywhere", async () => {
      (findTeamByAlias as Mock).mockReturnValue(null);
      (searchTeamIndex as Mock).mockResolvedValue([]);
      (searchGridTeamsByName as Mock).mockResolvedValue([]);

      const result = await resolveTeamName("Completely Unknown XYZ");

      expect(result).toBeNull();
    });

    it("returns null for empty input", async () => {
      const result = await resolveTeamName("");
      expect(result).toBeNull();

      const result2 = await resolveTeamName("   ");
      expect(result2).toBeNull();
    });

    it("handles alias match without gridId", async () => {
      (findTeamByAlias as Mock).mockReturnValue({
        gridName: "Team Liquid",
        gridId: "", // No gridId in alias table
        aliases: ["team liquid", "tl"],
      });

      const result = await resolveTeamName("Team Liquid");

      expect(result).not.toBeNull();
      expect(result?.gridId).toBe(""); // Empty but still resolved
      expect(result?.gridName).toBe("Team Liquid");
      expect(result?.confidence).toBe("exact");
      expect(result?.source).toBe("alias");
    });
  });

  describe("resolveMarketTeams", () => {
    it("resolves both teams in parallel", async () => {
      (findTeamByAlias as Mock)
        .mockReturnValueOnce({
          gridName: "FaZe Clan",
          gridId: "123",
          aliases: [],
        })
        .mockReturnValueOnce({
          gridName: "Natus Vincere",
          gridId: "456",
          aliases: [],
        });

      const result = await resolveMarketTeams("FaZe", "NaVi");

      expect(result.team1).not.toBeNull();
      expect(result.team2).not.toBeNull();
      expect(result.team1?.gridId).toBe("123");
      expect(result.team2?.gridId).toBe("456");
    });

    it("handles partial resolution (one team not found)", async () => {
      (findTeamByAlias as Mock)
        .mockReturnValueOnce({
          gridName: "FaZe Clan",
          gridId: "123",
          aliases: [],
        })
        .mockReturnValueOnce(null);
      (searchTeamIndex as Mock).mockResolvedValue([]);
      (searchGridTeamsByName as Mock).mockResolvedValue([]);

      const result = await resolveMarketTeams("FaZe", "Unknown Team");

      expect(result.team1).not.toBeNull();
      expect(result.team2).toBeNull();
    });
  });

  describe("resolveTeamNames", () => {
    it("resolves multiple team names", async () => {
      (findTeamByAlias as Mock)
        .mockReturnValueOnce({
          gridName: "FaZe Clan",
          gridId: "123",
          aliases: [],
        })
        .mockReturnValueOnce({
          gridName: "Natus Vincere",
          gridId: "456",
          aliases: [],
        })
        .mockReturnValueOnce({
          gridName: "Team Liquid",
          gridId: "789",
          aliases: [],
        });

      const result = await resolveTeamNames(["FaZe", "NaVi", "Liquid"]);

      expect(result.size).toBe(3);
      expect(result.get("FaZe")?.gridId).toBe("123");
      expect(result.get("NaVi")?.gridId).toBe("456");
      expect(result.get("Liquid")?.gridId).toBe("789");
    });

    it("deduplicates team names", async () => {
      (findTeamByAlias as Mock).mockReturnValue({
        gridName: "FaZe Clan",
        gridId: "123",
        aliases: [],
      });

      const result = await resolveTeamNames(["FaZe", "FaZe", "FaZe"]);

      // Should only call findTeamByAlias once for unique names
      expect(result.size).toBe(1);
      expect(result.get("FaZe")?.gridId).toBe("123");
    });
  });

  describe("getResolutionStats", () => {
    it("returns stats for CS2", () => {
      const stats = getResolutionStats("cs2");

      expect(stats.aliasCount).toBeGreaterThan(0);
      expect(stats.supportedGames).toContain("cs2");
    });

    it("returns zero aliases for unsupported games", () => {
      const stats = getResolutionStats("lol");

      expect(stats.aliasCount).toBe(0);
      expect(stats.supportedGames).toContain("cs2");
    });
  });
});
