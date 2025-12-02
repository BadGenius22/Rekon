import type { Context } from "hono";
import { publicSearch } from "../services/search";

export async function publicSearchController(c: Context) {
  const url = new URL(c.req.url);
  const query = url.searchParams.get("q") || url.searchParams.get("query");

  if (!query) {
    return c.json(
      {
        error: "Missing query parameter 'q'",
      },
      400
    );
  }

  const limitParam = url.searchParams.get("limit");
  const type = url.searchParams.get("type") || undefined;
  const limit = limitParam ? Number(limitParam) : undefined;

  const results = await publicSearch({
    query,
    limit,
    type,
  });

  return c.json(results);
}


