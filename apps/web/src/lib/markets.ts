import type { Market } from "@rekon/types";

export interface GroupedMatchMarkets {
  key: string;
  /**
   * Human-readable title for the match, e.g.
   * "Dota 2: Natus Vincere vs MOUZ (BO3)".
   */
  title: string;
  moneyline?: Market;
  games: Market[];
  others: Market[];
}

const GAME_WINNER_REGEX = /- Game\s*(\d+)\s*Winner/i;

/**
 * Extracts a stable "match key" from a market question.
 *
 * Examples:
 * - "Dota 2: Natus Vincere vs MOUZ (BO3)" → "Dota 2: Natus Vincere vs MOUZ"
 * - "Dota 2: Natus Vincere vs MOUZ - Game 1 Winner" → "Dota 2: Natus Vincere vs MOUZ"
 */
function extractMatchKey(question: string): string | null {
  // Normalise spacing
  const q = question.trim();

  // Try to strip best-of suffix first: "(BO3)", "(BO5)", etc.
  const boMatch = q.match(/^(.*?vs.*?)(?:\s*\(BO\d+\))?/i);
  if (boMatch && boMatch[1]) {
    return boMatch[1].trim();
  }

  // Fallback: strip game suffix, e.g. "- Game 1 Winner"
  const gameMatch = q.match(/^(.*?vs.*?)-\s*Game\s*\d+\s*Winner/i);
  if (gameMatch && gameMatch[1]) {
    return gameMatch[1].trim();
  }

  return null;
}

/**
 * Groups Dota 2 style markets (match winner + individual game winners)
 * into a Polymarket-like structure:
 *
 * - Moneyline (match/series winner)
 * - Game X Winner markets
 * - Any other props attached to the same match
 */
export function groupMatchMarkets(markets: Market[]): GroupedMatchMarkets[] {
  const groups = new Map<string, GroupedMatchMarkets>();

  for (const market of markets) {
    const key = extractMatchKey(market.question);
    if (!key) {
      continue;
    }

    const mapKey = key.toLowerCase();
    let group = groups.get(mapKey);
    if (!group) {
      group = {
        key: mapKey,
        title: key,
        moneyline: undefined,
        games: [],
        others: [],
      };
      groups.set(mapKey, group);
    }

    const question = market.question;
    const isGameWinner = GAME_WINNER_REGEX.test(question);
    const isMoneyline =
      !isGameWinner &&
      /vs/i.test(question) &&
      // Heuristic: treat the BO3/BO5 question as the primary moneyline.
      /\(BO\d+\)/i.test(question);

    if (isGameWinner) {
      group.games.push(market);
    } else if (isMoneyline && !group.moneyline) {
      group.moneyline = market;
      group.title = question;
    } else {
      group.others.push(market);
    }
  }

  return Array.from(groups.values());
}


