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
 */
export function matchesTeamName(
  name1: string | undefined,
  name2: string
): boolean {
  if (!name1) return false;
  
  const norm1 = normalizeTeamName(name1);
  const norm2 = normalizeTeamName(name2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Substring match (handles abbreviations)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Word-based match (handles "Team Liquid" vs "Liquid")
  const words1 = norm1.split(/\s+/);
  const words2 = norm2.split(/\s+/);
  
  return (
    words1.some((word) => norm2.includes(word)) ||
    words2.some((word) => norm1.includes(word))
  );
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

