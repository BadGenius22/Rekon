import {
  fetchGammaComments,
  fetchGammaCommentById,
  fetchGammaCommentsByUserAddress,
} from "../adapters/polymarket";

export interface GetCommentsParams {
  limit?: number;
  offset?: number;
  userAddress?: string;
}

export async function getComments(
  params: GetCommentsParams = {}
): Promise<unknown> {
  if (params.userAddress) {
    return fetchGammaCommentsByUserAddress(params.userAddress, {
      limit: params.limit,
      offset: params.offset,
    });
  }

  return fetchGammaComments({
    limit: params.limit,
    offset: params.offset,
  });
}

export async function getCommentById(id: string): Promise<unknown> {
  return fetchGammaCommentById(id);
}
