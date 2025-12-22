/**
 * Team Name Utilities for Polymarket → GRID Matching
 *
 * Provides normalization functions and alias mappings for resolving
 * esports team names between Polymarket markets and GRID API.
 */

/**
 * Normalize a team name for matching
 * Removes common suffixes, special characters, and normalizes spacing
 *
 * @example
 * normalizeTeamName("FaZe Clan") → "faze"
 * normalizeTeamName("Team Liquid Gaming") → "liquid"
 * normalizeTeamName("Natus Vincere") → "natus vincere"
 */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common esports org suffixes
    .replace(/\s*(gaming|esports|esport|team|clan|org)\s*/gi, " ")
    // Remove special characters except spaces
    .replace(/[^a-z0-9\s]/g, "")
    // Normalize multiple spaces to single space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract acronym from a team name
 * Useful for matching shortened team names
 *
 * @example
 * extractTeamAcronym("Natus Vincere") → "NV"
 * extractTeamAcronym("Team Liquid") → "TL"
 * extractTeamAcronym("G2 Esports") → "GE"
 * extractTeamAcronym("FaZe") → null (single word)
 */
export function extractTeamAcronym(name: string): string | null {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]?.toUpperCase() || "").join("");
  }
  return null;
}

/**
 * Calculate string similarity using Dice coefficient
 * Returns a score between 0 (no match) and 1 (exact match)
 *
 * @example
 * calculateStringSimilarity("faze", "faze clan") → ~0.67
 * calculateStringSimilarity("liquid", "team liquid") → ~0.75
 */
export function calculateStringSimilarity(a: string, b: string): number {
  const aNorm = normalizeTeamName(a);
  const bNorm = normalizeTeamName(b);

  if (aNorm === bNorm) return 1;
  if (aNorm.length < 2 || bNorm.length < 2) return 0;

  // Generate bigrams
  const bigramsA = new Set<string>();
  for (let i = 0; i < aNorm.length - 1; i++) {
    bigramsA.add(aNorm.substring(i, i + 2));
  }

  const bigramsB = new Set<string>();
  for (let i = 0; i < bNorm.length - 1; i++) {
    bigramsB.add(bNorm.substring(i, i + 2));
  }

  // Count intersections
  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) {
      intersection++;
    }
  }

  // Dice coefficient
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// =============================================================================
// CS2 Team Aliases
// Top 50+ CS2 teams with their known aliases
// Canonical name (lowercase) → array of aliases
// =============================================================================

export interface TeamAliasEntry {
  /** Canonical GRID team name */
  gridName: string;
  /** GRID team ID (if known, empty string if needs lookup) */
  gridId: string;
  /** Alternative names/aliases */
  aliases: string[];
}

/**
 * CS2 Team Alias Mapping
 *
 * Maps canonical team names to their aliases for efficient matching.
 * Key: normalized canonical name
 * Value: TeamAliasEntry with gridName, gridId, and aliases
 *
 * Note: gridId values need to be populated from GRID API lookups.
 * Run integration tests to discover and fill in IDs.
 */
export const CS2_TEAM_ALIASES: Record<string, TeamAliasEntry> = {
  // Tier 1 Teams
  "natus vincere": {
    gridName: "Natus Vincere",
    gridId: "", // Lookup from GRID
    aliases: ["navi", "na'vi", "natus", "natus vincere"],
  },
  faze: {
    gridName: "FaZe Clan",
    gridId: "",
    aliases: ["faze clan", "faze esports", "fazeclan"],
  },
  liquid: {
    gridName: "Team Liquid",
    gridId: "",
    aliases: ["team liquid", "tl", "teamliquid"],
  },
  g2: {
    gridName: "G2 Esports",
    gridId: "",
    aliases: ["g2 esports", "g2esports", "g2.esports"],
  },
  vitality: {
    gridName: "Team Vitality",
    gridId: "",
    aliases: ["team vitality", "vit", "vita"],
  },
  heroic: {
    gridName: "HEROIC",
    gridId: "",
    aliases: ["heroic gaming"],
  },
  "virtus pro": {
    gridName: "Virtus.pro",
    gridId: "",
    aliases: ["virtuspro", "vp", "virtus.pro"],
  },
  cloud9: {
    gridName: "Cloud9",
    gridId: "",
    aliases: ["c9", "cloud 9"],
  },
  mouz: {
    gridName: "MOUZ",
    gridId: "",
    aliases: ["mousesports", "mouse", "mouz nxt"],
  },
  spirit: {
    gridName: "Team Spirit",
    gridId: "",
    aliases: ["team spirit", "spirit gaming"],
  },
  astralis: {
    gridName: "Astralis",
    gridId: "",
    aliases: ["astralis talent"],
  },
  complexity: {
    gridName: "Complexity Gaming",
    gridId: "",
    aliases: ["complexity gaming", "col", "complexity"],
  },
  ence: {
    gridName: "ENCE",
    gridId: "",
    aliases: ["ence esports"],
  },
  eternal: {
    gridName: "Eternal Fire",
    gridId: "",
    aliases: ["eternal fire", "ef"],
  },
  falcons: {
    gridName: "Falcons Esports",
    gridId: "",
    aliases: ["falcons", "falcons esports"],
  },
  fnatic: {
    gridName: "Fnatic",
    gridId: "",
    aliases: ["fnc"],
  },
  furia: {
    gridName: "FURIA Esports",
    gridId: "",
    aliases: ["furia", "furia esports"],
  },
  "monte": {
    gridName: "Monte",
    gridId: "",
    aliases: ["monte esports"],
  },
  ninjas: {
    gridName: "Ninjas in Pyjamas",
    gridId: "",
    aliases: ["ninjas in pyjamas", "nip", "ninjas"],
  },
  "pain": {
    gridName: "paiN Gaming",
    gridId: "",
    aliases: ["pain gaming", "pain", "paingaming"],
  },
  saw: {
    gridName: "SAW",
    gridId: "",
    aliases: ["saw esports"],
  },
  theMongolz: {
    gridName: "The MongolZ",
    gridId: "",
    aliases: ["mongolz", "the mongolz", "themongolz"],
  },
  "3dmax": {
    gridName: "3DMAX",
    gridId: "",
    aliases: ["3d max"],
  },
  betboom: {
    gridName: "BetBoom Team",
    gridId: "",
    aliases: ["betboom", "betboom team"],
  },
  "big": {
    gridName: "BIG",
    gridId: "",
    aliases: ["big clan"],
  },
  gamerlegion: {
    gridName: "GamerLegion",
    gridId: "",
    aliases: ["gamer legion", "gl"],
  },
  imperial: {
    gridName: "Imperial Esports",
    gridId: "",
    aliases: ["imperial", "imperial esports"],
  },
  m80: {
    gridName: "M80",
    gridId: "",
    aliases: ["m80 esports"],
  },
  mibr: {
    gridName: "MIBR",
    gridId: "",
    aliases: ["made in brazil"],
  },
  nrg: {
    gridName: "NRG Esports",
    gridId: "",
    aliases: ["nrg", "nrg esports"],
  },
  og: {
    gridName: "OG",
    gridId: "",
    aliases: ["og esports"],
  },
  wildcard: {
    gridName: "Wildcard Gaming",
    gridId: "",
    aliases: ["wildcard", "wildcard gaming"],
  },
};

/**
 * Find a team entry by searching through aliases
 *
 * @param query - The team name to search for (will be normalized)
 * @returns TeamAliasEntry if found, null otherwise
 */
export function findTeamByAlias(query: string): TeamAliasEntry | null {
  const normalized = normalizeTeamName(query);

  // Direct key lookup
  if (CS2_TEAM_ALIASES[normalized]) {
    return CS2_TEAM_ALIASES[normalized];
  }

  // Search through all entries' aliases
  for (const [key, entry] of Object.entries(CS2_TEAM_ALIASES)) {
    // Check if query matches any alias
    if (entry.aliases.some((alias) => normalizeTeamName(alias) === normalized)) {
      return entry;
    }

    // Check if query matches the key
    if (key === normalized) {
      return entry;
    }
  }

  return null;
}

/**
 * Get all known CS2 team names (for building Fuse.js index)
 *
 * @returns Array of all team names including aliases
 */
export function getAllCS2TeamNames(): string[] {
  const names: string[] = [];

  for (const entry of Object.values(CS2_TEAM_ALIASES)) {
    names.push(entry.gridName);
    names.push(...entry.aliases);
  }

  return [...new Set(names)]; // Remove duplicates
}
