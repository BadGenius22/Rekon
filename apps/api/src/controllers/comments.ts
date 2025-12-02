import type { Context } from "hono";
import { getComments, getCommentById } from "../services/comments";

export async function getCommentsController(c: Context) {
  const url = new URL(c.req.url);
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const userAddress = url.searchParams.get("userAddress") || undefined;

  const limit = limitParam ? Number(limitParam) : undefined;
  const offset = offsetParam ? Number(offsetParam) : undefined;

  const comments = await getComments({
    limit,
    offset,
    userAddress,
  });

  return c.json(comments);
}

export async function getCommentByIdController(c: Context) {
  const id = c.req.param("id");
  const comment = await getCommentById(id);

  if (!comment) {
    return c.json(
      {
        error: "Comment not found",
      },
      404
    );
  }

  return c.json(comment);
}


