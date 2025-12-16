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

  // Extract Polymarket API parameters
  const limitPerType = url.searchParams.get("limit_per_type");
  const limit = url.searchParams.get("limit");
  const type = url.searchParams.get("type") || undefined;
  const cache = url.searchParams.get("cache");
  const eventsStatus = url.searchParams.get("events_status");
  const page = url.searchParams.get("page");
  const eventsTag = url.searchParams.getAll("events_tag");
  const keepClosedMarkets = url.searchParams.get("keep_closed_markets");
  const sort = url.searchParams.get("sort");
  const ascending = url.searchParams.get("ascending");
  const searchTags = url.searchParams.get("search_tags");
  const searchProfiles = url.searchParams.get("search_profiles");
  const recurrence = url.searchParams.get("recurrence");
  const excludeTagId = url.searchParams.getAll("exclude_tag_id");
  const optimized = url.searchParams.get("optimized");

  const results = await publicSearch({
    query,
    limit: limit ? Number(limit) : undefined,
    limitPerType: limitPerType ? Number(limitPerType) : undefined,
    type,
    cache: cache === "true" ? true : cache === "false" ? false : undefined,
    eventsStatus: eventsStatus ?? undefined,
    page: page ? Number(page) : undefined,
    eventsTag: eventsTag.length > 0 ? eventsTag : undefined,
    keepClosedMarkets: keepClosedMarkets
      ? Number(keepClosedMarkets)
      : undefined,
    sort: sort ?? undefined,
    ascending: ascending === "true" ? true : ascending === "false" ? false : undefined,
    searchTags: searchTags === "true" ? true : searchTags === "false" ? false : undefined,
    searchProfiles:
      searchProfiles === "true" ? true : searchProfiles === "false" ? false : undefined,
    recurrence: recurrence ?? undefined,
    excludeTagId:
      excludeTagId.length > 0
        ? excludeTagId.map((id) => Number(id)).filter((id) => !isNaN(id))
        : undefined,
    optimized:
      optimized === "true" ? true : optimized === "false" ? false : undefined,
  });

  return c.json(results);
}


