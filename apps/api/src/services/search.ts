import { fetchGammaPublicSearch } from "../adapters/polymarket/index.js";

export interface PublicSearchParams {
  query: string;
  limit?: number;
  limitPerType?: number;
  type?: string;
  cache?: boolean;
  eventsStatus?: string;
  page?: number;
  eventsTag?: string[];
  keepClosedMarkets?: number;
  sort?: string;
  ascending?: boolean;
  searchTags?: boolean;
  searchProfiles?: boolean;
  recurrence?: string;
  excludeTagId?: number[];
  optimized?: boolean;
}

export async function publicSearch(
  params: PublicSearchParams
): Promise<unknown> {
  return fetchGammaPublicSearch({
    query: params.query,
    limit: params.limit,
    limitPerType: params.limitPerType,
    type: params.type,
    cache: params.cache,
    eventsStatus: params.eventsStatus,
    page: params.page,
    eventsTag: params.eventsTag,
    keepClosedMarkets: params.keepClosedMarkets,
    sort: params.sort,
    ascending: params.ascending,
    searchTags: params.searchTags,
    searchProfiles: params.searchProfiles,
    recurrence: params.recurrence,
    excludeTagId: params.excludeTagId,
    optimized: params.optimized,
  });
}


