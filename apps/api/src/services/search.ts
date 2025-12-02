import { fetchGammaPublicSearch } from "../adapters/polymarket";

export interface PublicSearchParams {
  query: string;
  limit?: number;
  type?: string;
}

export async function publicSearch(params: PublicSearchParams): Promise<unknown> {
  return fetchGammaPublicSearch({
    query: params.query,
    limit: params.limit,
    type: params.type,
  });
}


