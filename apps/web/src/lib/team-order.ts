/**
 * Utility functions for ensuring consistent team ordering across components
 */

/**
 * Normalizes team names for comparison (case-insensitive, trimmed)
 */
function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Checks if two team names match (case-insensitive, fuzzy matching)
 * Handles abbreviations, partial matches, and word-based matching
 * 
 * Matching rules (in order of priority):
 * 1. Exact match (case-insensitive)
 * 2. One name is a clear abbreviation of the other (e.g., "TL" in "Team Liquid")
 * 3. All significant words match (words >= 4 chars)
 * 4. Majority of significant words match
 */
export function matchesTeamName(
  name1: string | undefined,
  name2: string
): boolean {
  if (!name1) return false;
  
  const norm1 = normalizeTeamName(name1);
  const norm2 = normalizeTeamName(name2);
  
  // 1. Exact match
  if (norm1 === norm2) return true;
  
  // 2. One name is clearly contained in the other (for abbreviations)
  // Only match if the shorter name is at least 2 chars and the longer name
  // starts with or contains the shorter as a complete word
  const shorter = norm1.length <= norm2.length ? norm1 : norm2;
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  
  if (shorter.length >= 2) {
    // Check if shorter is a word boundary match in longer
    const wordBoundaryRegex = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (wordBoundaryRegex.test(longer)) {
      return true;
    }
    // Check if shorter appears at the start of longer (for abbreviations like "TL" -> "Team Liquid")
    if (longer.startsWith(shorter) && longer.length - shorter.length >= 2) {
      return true;
    }
  }
  
  // 3. Word-based matching (only for significant words >= 4 characters)
  const words1 = norm1.split(/\s+/).filter(w => w.length >= 4);
  const words2 = norm2.split(/\s+/).filter(w => w.length >= 4);
  
  // If no significant words, fall back to exact match only
  if (words1.length === 0 || words2.length === 0) {
    return false;
  }
  
  // Check if all significant words from one name appear in the other
  const allWords1Match = words1.every(word => {
    const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return wordRegex.test(norm2);
  });
  
  const allWords2Match = words2.every(word => {
    const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return wordRegex.test(norm1);
  });
  
  if (allWords1Match || allWords2Match) {
    return true;
  }
  
  // 4. Majority match: require strong word overlap
  // This prevents false matches like "morning star" vs "morning light" (only 1/2 words match)
  const matchingWords1 = words1.filter(word => {
    const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return wordRegex.test(norm2);
  });
  
  const matchingWords2 = words2.filter(word => {
    const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return wordRegex.test(norm1);
  });
  
  // For single-word names, require exact or near-exact match (handled by abbreviation check above)
  // For multi-word names, require that:
  // - All words from the shorter name match, OR
  // - At least 2/3 of words match from both sides AND at least 2 words match
  if (words1.length === 1 || words2.length === 1) {
    // Single word case: if one name has only one significant word, it must match exactly
    // (abbreviation cases are already handled above)
    return false;
  }
  
  const matchRatio1 = words1.length > 0 ? matchingWords1.length / words1.length : 0;
  const matchRatio2 = words2.length > 0 ? matchingWords2.length / words2.length : 0;
  
  // Require at least 2/3 (66.7%) match from both perspectives
  // AND at least 2 matching words to avoid false positives like "morning star" vs "morning light"
  const minMatchingWords = Math.min(2, Math.min(words1.length, words2.length));
  const hasEnoughMatches = 
    matchingWords1.length >= minMatchingWords && 
    matchingWords2.length >= minMatchingWords;
  
  return hasEnoughMatches && matchRatio1 >= 0.67 && matchRatio2 >= 0.67;
}

/**
 * Extracts team names in the correct order from market question
 * This ensures teams match the order shown in the question (e.g., "Team A vs Team B")
 * 
 * @param question - Market question text
 * @param outcomes - Array of market outcomes with name property
 * @returns Object with team1Name and team2Name in question order, or null if can't parse
 */
export function extractTeamOrderFromQuestion(
  question: string,
  outcomes: Array<{ name: string }>
): { team1Name: string; team2Name: string } | null {
  if (outcomes.length < 2) return null;

  // Try multiple patterns to parse "Team A vs Team B" format
  const patterns = [
    /(.+?)\s+vs\.?\s+(.+?)(?:\s*\(|$|:)/i,  // "Team A vs Team B"
    /(.+?)\s+VS\s+(.+?)(?:\s*\(|$|:)/i,     // "Team A VS Team B"
    /(.+?)\s+-\s+(.+?)(?:\s*\(|$|:)/i,      // "Team A - Team B"
  ];
  
  let match: RegExpMatchArray | null = null;
  for (const pattern of patterns) {
    match = question.match(pattern);
    if (match) break;
  }
  
  if (match) {
    const questionTeam1 = match[1].trim();
    const questionTeam2 = match[2].trim();
    
    // Find matching outcomes using fuzzy matching
    const outcome1 = outcomes.find((o) => matchesTeamName(o.name, questionTeam1));
    const outcome2 = outcomes.find((o) => matchesTeamName(o.name, questionTeam2));

    // If we found both teams in the question order, use that order
    if (outcome1 && outcome2 && outcome1 !== outcome2) {
      return {
        team1Name: outcome1.name,
        team2Name: outcome2.name,
      };
    }
  }

  // Fallback: use outcomes array order
  return {
    team1Name: outcomes[0]?.name || "Team 1",
    team2Name: outcomes[1]?.name || "Team 2",
  };
}

/**
 * Ensures team order consistency by matching team names
 * Returns teams in the reference order (team1Name, team2Name)
 * 
 * @param team1Name - First team name from reference (e.g., market)
 * @param team2Name - Second team name from reference
 * @param teamA - First team name to check
 * @param teamB - Second team name to check
 * @returns Object with team1 and team2 in reference order
 */
export function ensureTeamOrder(
  team1Name: string,
  team2Name: string,
  teamA: string,
  teamB: string
): { team1: string; team2: string } {
  // Check which team matches the reference team1Name
  const teamAMatchesRef1 = matchesTeamName(teamA, team1Name);
  const teamBMatchesRef1 = matchesTeamName(teamB, team1Name);
  
  // If teamA matches reference team1, return in reference order
  if (teamAMatchesRef1 && !teamBMatchesRef1) {
    return { team1: teamA, team2: teamB };
  }
  
  // If teamB matches reference team1, swap them
  if (teamBMatchesRef1 && !teamAMatchesRef1) {
    return { team1: teamB, team2: teamA };
  }
  
  // If both match or neither matches, return as-is (assume already in correct order)
  // This handles edge cases where matching is ambiguous
  return { team1: teamA, team2: teamB };
}

