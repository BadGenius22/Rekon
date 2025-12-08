/**
 * Games Service
 *
 * Provides game/sport metadata from Polymarket's Gamma API.
 * Maps raw sports data to esports game icons and metadata.
 */

import { fetchGammaSports } from "../adapters/polymarket";

/**
 * Game metadata with icon URL from Polymarket
 */
export interface GameInfo {
  id: string; // Our internal ID (cs2, lol, dota2, valorant)
  name: string; // Display name
  shortName: string; // Short display name
  imageUrl: string; // Official Polymarket image URL
  polymarketSport: string; // Polymarket's sport identifier
}

/**
 * Mapping from our game IDs to Polymarket sport identifiers
 * These match the "sport" field in Polymarket's /sports API
 */
const GAME_TO_POLYMARKET_SPORT: Record<string, string> = {
  cs2: "cs2",
  lol: "lol",
  dota2: "dota2",
  valorant: "valorant",
  cod: "codmw", // Call of Duty (Modern Warfare / CDL)
  r6: "r6siege", // Rainbow Six Siege
  hok: "kog", // King of Glory / Honor of Kings (mobile MOBA)
};

/**
 * Game display metadata
 */
const GAME_METADATA: Record<string, { name: string; shortName: string }> = {
  cs2: { name: "Counter-Strike 2", shortName: "CS2" },
  lol: { name: "League of Legends", shortName: "LoL" },
  dota2: { name: "Dota 2", shortName: "Dota 2" },
  valorant: { name: "Valorant", shortName: "Valorant" },
  cod: { name: "Call of Duty", shortName: "CoD" },
  r6: { name: "Rainbow Six Siege", shortName: "R6" },
  hok: { name: "Honor of Kings", shortName: "HoK" },
};

/**
 * Polymarket sport response type
 */
interface PolymarketSport {
  id: number;
  sport: string;
  image: string;
  resolution?: string;
  ordering?: string;
  tags?: string;
  series?: string;
  createdAt?: string;
}

/**
 * Fetches esports game metadata including official icons from Polymarket.
 * Returns only the 4 supported esports games.
 */
export async function getEsportsGames(): Promise<GameInfo[]> {
  try {
    const sports = (await fetchGammaSports()) as PolymarketSport[];

    if (!Array.isArray(sports)) {
      console.warn("[Games] Invalid sports response, returning defaults");
      return getDefaultGames();
    }

    // Build a map of sport -> image URL
    const sportImageMap = new Map<string, string>();
    for (const sport of sports) {
      if (sport.sport && sport.image) {
        sportImageMap.set(sport.sport.toLowerCase(), sport.image);
      }
    }

    // Map our supported games to their metadata
    const games: GameInfo[] = [];
    for (const [gameId, polymarketSport] of Object.entries(
      GAME_TO_POLYMARKET_SPORT
    )) {
      const metadata = GAME_METADATA[gameId];
      const imageUrl = sportImageMap.get(polymarketSport.toLowerCase());

      if (metadata && imageUrl) {
        games.push({
          id: gameId,
          name: metadata.name,
          shortName: metadata.shortName,
          imageUrl,
          polymarketSport,
        });
      } else if (metadata) {
        // Use default image if not found in API response
        const defaultImage = getDefaultImageUrl(gameId);
        if (defaultImage) {
          games.push({
            id: gameId,
            name: metadata.name,
            shortName: metadata.shortName,
            imageUrl: defaultImage,
            polymarketSport,
          });
        }
      }
    }

    // Sort by game ID for consistent ordering
    games.sort((a, b) => {
      const order = ["cs2", "cod", "lol", "dota2", "r6", "valorant", "hok"];
      return order.indexOf(a.id) - order.indexOf(b.id);
    });

    return games;
  } catch (error) {
    console.error("[Games] Error fetching esports games:", error);
    return getDefaultGames();
  }
}

/**
 * Fetches icon URLs for all supported esports games.
 * Returns a map of gameId -> imageUrl.
 */
export async function getGameIcons(): Promise<Record<string, string>> {
  const games = await getEsportsGames();
  const icons: Record<string, string> = {};

  for (const game of games) {
    icons[game.id] = game.imageUrl;
  }

  return icons;
}

/**
 * Default fallback image URLs (cached from Polymarket CDN)
 * Used when API is unavailable or returns incomplete data
 * URLs sourced from Polymarket's /sports API (2024-12)
 */
function getDefaultImageUrl(gameId: string): string | undefined {
  const defaults: Record<string, string> = {
    cs2: "https://polymarket-upload.s3.us-east-2.amazonaws.com/counter-strike-image-16c415c538.png",
    lol: "https://polymarket-upload.s3.us-east-2.amazonaws.com/league-of-legends-61a4f083a6.png",
    dota2:
      "https://polymarket-upload.s3.us-east-2.amazonaws.com/dota-2-iamge-e93dd0923f.png",
    valorant:
      "https://polymarket-upload.s3.us-east-2.amazonaws.com/valorant-logo-6fab741a16.png",
    // Verified URLs from Polymarket /sports API
    cod: "https://polymarket-upload.s3.us-east-2.amazonaws.com/call-of-duty-208ecf2953.png",
    r6: "https://polymarket-upload.s3.us-east-2.amazonaws.com/rainbow-6-siege-049a0d8344.jpg",
    hok: "https://polymarket-upload.s3.us-east-2.amazonaws.com/honor-of-kings-fb99edf26f.jpg",
  };
  return defaults[gameId];
}

/**
 * Returns default game list when API is unavailable
 */
function getDefaultGames(): GameInfo[] {
  return Object.entries(GAME_METADATA).map(([gameId, metadata]) => ({
    id: gameId,
    name: metadata.name,
    shortName: metadata.shortName,
    imageUrl: getDefaultImageUrl(gameId) || "",
    polymarketSport: GAME_TO_POLYMARKET_SPORT[gameId],
  }));
}
