/**
 * Test full flow: DB lookup → GRID API stats
 * Tests direct GraphQL call to understand the schema
 */
import { searchTeamsByNameBasic } from "../db/teams.js";
import { GraphQLClient } from "graphql-request";
import { GRID_CONFIG } from "@rekon/config";

// Correct schema: filter uses timeWindow enum directly
const TEST_QUERY = `
  query GetTeamStatistics($teamId: ID!) {
    teamStatistics(teamId: $teamId, filter: { timeWindow: LAST_3_MONTHS }) {
      id
      aggregationSeriesIds
      series {
        count
        kills {
          sum
          avg
        }
        deaths {
          sum
          avg
        }
      }
      game {
        count
        wins {
          value
          count
          percentage
          streak {
            current
          }
        }
      }
    }
  }
`;

async function main() {
  const teamName = "Tricked";

  console.log("=== Step 1: Look up team in Neon DB ===\n");

  const startDb = Date.now();
  const results = await searchTeamsByNameBasic(teamName, 3);
  const dbTime = Date.now() - startDb;

  if (results.length === 0) {
    console.log(`❌ Team "${teamName}" not found in DB`);
    return;
  }

  console.log(`✅ Found ${results.length} match(es) in ${dbTime}ms:`);
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.name} (ID: ${r.gridId}, similarity: ${r.similarity})`);
  });

  const teamId = results[0].gridId;
  console.log(`\n=== Step 2: Using Team ID: ${teamId} ===\n`);

  console.log("=== Step 3: Fetch Historical Stats from GRID API ===\n");

  const client = new GraphQLClient(GRID_CONFIG.statisticsFeedUrl, {
    headers: {
      "x-api-key": GRID_CONFIG.apiKey || "",
      "Content-Type": "application/json",
    },
  });

  const startApi = Date.now();

  try {
    const data = await client.request<{ teamStatistics: any }>(TEST_QUERY, { teamId });
    const apiTime = Date.now() - startApi;

    const stats = data.teamStatistics;

    if (!stats) {
      console.log(`❌ No stats found for team ID ${teamId}`);
      return;
    }

    console.log(`✅ Stats fetched in ${apiTime}ms:\n`);
    console.log(`Team Stats ID: ${stats.id}`);
    console.log(`Series analyzed: ${stats.aggregationSeriesIds?.length || 0}`);
    console.log(`\n--- Series Stats (Last 3 Months) ---`);
    console.log(`Total series: ${stats.series?.count || 0}`);
    console.log(`Kills: ${stats.series?.kills?.sum || 0} (avg: ${(stats.series?.kills?.avg || 0).toFixed(1)}/series)`);
    console.log(`Deaths: ${stats.series?.deaths?.sum || 0} (avg: ${(stats.series?.deaths?.avg || 0).toFixed(1)}/series)`);

    const kd = stats.series?.deaths?.sum > 0
      ? (stats.series?.kills?.sum / stats.series?.deaths?.sum).toFixed(2)
      : "N/A";
    console.log(`K/D Ratio: ${kd}`);

    console.log(`\n--- Game Stats ---`);
    console.log(`Total games: ${stats.game?.count || 0}`);
    console.log(`Wins: ${stats.game?.wins?.count || 0} (${((stats.game?.wins?.percentage || 0) * 100).toFixed(1)}%)`);
    console.log(`Current win streak: ${stats.game?.wins?.streak?.current || 0}`);

    console.log(`\n=== Summary ===`);
    console.log(`DB lookup: ${dbTime}ms`);
    console.log(`GRID API: ${apiTime}ms`);
    console.log(`Total: ${dbTime + apiTime}ms`);
  } catch (error: any) {
    console.log(`❌ GRID API Error:`, error.message?.slice(0, 500));
  }
}

main().catch(console.error);
