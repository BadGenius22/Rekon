import { describe, it, expect } from "vitest";
import {
  normalizeTeamName,
  extractTeamAcronym,
  calculateStringSimilarity,
  findTeamByAlias,
  getAllCS2TeamNames,
  CS2_TEAM_ALIASES,
} from "./team-names";

describe("normalizeTeamName", () => {
  it("converts to lowercase and trims", () => {
    expect(normalizeTeamName("  FaZe Clan  ")).toBe("faze");
    expect(normalizeTeamName("TEAM LIQUID")).toBe("liquid");
  });

  it("removes common esports suffixes", () => {
    expect(normalizeTeamName("FaZe Clan")).toBe("faze");
    expect(normalizeTeamName("Team Liquid")).toBe("liquid");
    expect(normalizeTeamName("G2 Esports")).toBe("g2");
    expect(normalizeTeamName("FURIA Esports")).toBe("furia");
    expect(normalizeTeamName("NRG Gaming")).toBe("nrg");
    expect(normalizeTeamName("Cloud9 Org")).toBe("cloud9");
  });

  it("removes special characters except spaces", () => {
    expect(normalizeTeamName("Virtus.pro")).toBe("virtuspro");
    expect(normalizeTeamName("Na'Vi")).toBe("navi");
    expect(normalizeTeamName("G2.Esports")).toBe("g2");
  });

  it("normalizes multiple spaces to single space", () => {
    expect(normalizeTeamName("Natus   Vincere")).toBe("natus vincere");
    expect(normalizeTeamName("Team  Spirit")).toBe("spirit");
  });

  it("handles edge cases", () => {
    expect(normalizeTeamName("")).toBe("");
    expect(normalizeTeamName("   ")).toBe("");
    expect(normalizeTeamName("A")).toBe("a");
  });
});

describe("extractTeamAcronym", () => {
  it("extracts acronym from multi-word names", () => {
    expect(extractTeamAcronym("Natus Vincere")).toBe("NV");
    expect(extractTeamAcronym("Team Liquid")).toBe("TL");
    expect(extractTeamAcronym("G2 Esports")).toBe("GE");
    expect(extractTeamAcronym("Ninjas in Pyjamas")).toBe("NIP");
  });

  it("returns null for single-word names", () => {
    expect(extractTeamAcronym("FaZe")).toBeNull();
    expect(extractTeamAcronym("HEROIC")).toBeNull();
    expect(extractTeamAcronym("MOUZ")).toBeNull();
  });

  it("handles edge cases", () => {
    expect(extractTeamAcronym("")).toBeNull();
    expect(extractTeamAcronym("   ")).toBeNull();
  });
});

describe("calculateStringSimilarity", () => {
  it("returns 1 for exact matches after normalization", () => {
    expect(calculateStringSimilarity("FaZe Clan", "faze")).toBe(1);
    expect(calculateStringSimilarity("Team Liquid", "liquid")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(calculateStringSimilarity("FaZe", "Liquid")).toBeLessThan(0.3);
    expect(calculateStringSimilarity("NAVI", "Cloud9")).toBeLessThan(0.3);
  });

  it("returns high similarity for similar strings", () => {
    expect(
      calculateStringSimilarity("Natus Vincere", "Natus")
    ).toBeGreaterThanOrEqual(0.5);
    expect(
      calculateStringSimilarity("Team Liquid", "Liquid Gaming")
    ).toBeGreaterThanOrEqual(0.5);
  });

  it("handles short strings", () => {
    expect(calculateStringSimilarity("a", "b")).toBe(0);
    expect(calculateStringSimilarity("G2", "G2 Esports")).toBe(1); // After normalization both are "g2"
  });
});

describe("CS2_TEAM_ALIASES", () => {
  it("contains major CS2 teams", () => {
    expect(CS2_TEAM_ALIASES["natus vincere"]).toBeDefined();
    expect(CS2_TEAM_ALIASES["faze"]).toBeDefined();
    expect(CS2_TEAM_ALIASES["liquid"]).toBeDefined();
    expect(CS2_TEAM_ALIASES["g2"]).toBeDefined();
    expect(CS2_TEAM_ALIASES["vitality"]).toBeDefined();
  });

  it("has correct structure for each entry", () => {
    for (const [key, entry] of Object.entries(CS2_TEAM_ALIASES)) {
      expect(entry).toHaveProperty("gridName");
      expect(entry).toHaveProperty("gridId");
      expect(entry).toHaveProperty("aliases");
      expect(Array.isArray(entry.aliases)).toBe(true);
      expect(typeof entry.gridName).toBe("string");
      expect(typeof entry.gridId).toBe("string");
    }
  });

  it("includes common aliases for major teams", () => {
    expect(CS2_TEAM_ALIASES["natus vincere"].aliases).toContain("navi");
    expect(CS2_TEAM_ALIASES["faze"].aliases).toContain("faze clan");
    expect(CS2_TEAM_ALIASES["liquid"].aliases).toContain("tl");
    expect(CS2_TEAM_ALIASES["cloud9"].aliases).toContain("c9");
    expect(CS2_TEAM_ALIASES["virtus pro"].aliases).toContain("vp");
  });
});

describe("findTeamByAlias", () => {
  it("finds team by canonical name", () => {
    const result = findTeamByAlias("natus vincere");
    expect(result).not.toBeNull();
    expect(result?.gridName).toBe("Natus Vincere");
  });

  it("finds team by alias", () => {
    const result = findTeamByAlias("navi");
    expect(result).not.toBeNull();
    expect(result?.gridName).toBe("Natus Vincere");

    const result2 = findTeamByAlias("c9");
    expect(result2).not.toBeNull();
    expect(result2?.gridName).toBe("Cloud9");

    const result3 = findTeamByAlias("vp");
    expect(result3).not.toBeNull();
    expect(result3?.gridName).toBe("Virtus.pro");
  });

  it("finds team with case-insensitive search", () => {
    const result = findTeamByAlias("NAVI");
    expect(result).not.toBeNull();
    expect(result?.gridName).toBe("Natus Vincere");

    const result2 = findTeamByAlias("FaZe Clan");
    expect(result2).not.toBeNull();
    expect(result2?.gridName).toBe("FaZe Clan");
  });

  it("returns null for unknown teams", () => {
    const result = findTeamByAlias("Unknown Team XYZ");
    expect(result).toBeNull();
  });

  it("handles normalized input with suffixes stripped", () => {
    const result = findTeamByAlias("FaZe Esports");
    expect(result).not.toBeNull();
    expect(result?.gridName).toBe("FaZe Clan");
  });
});

describe("getAllCS2TeamNames", () => {
  it("returns array of all team names", () => {
    const names = getAllCS2TeamNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(50); // Should have lots of names including aliases
  });

  it("includes canonical names", () => {
    const names = getAllCS2TeamNames();
    expect(names).toContain("Natus Vincere");
    expect(names).toContain("FaZe Clan");
    expect(names).toContain("Team Liquid");
  });

  it("includes aliases", () => {
    const names = getAllCS2TeamNames();
    expect(names).toContain("navi");
    expect(names).toContain("c9");
    expect(names).toContain("vp");
  });

  it("removes duplicates", () => {
    const names = getAllCS2TeamNames();
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });
});
