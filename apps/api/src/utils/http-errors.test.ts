import { describe, it, expect } from "vitest";
import { HTTPException } from "hono/http-exception";
import {
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Conflict,
  UnprocessableEntity,
  TooManyRequests,
  InternalServerError,
} from "./http-errors";

describe("utils/http-errors", () => {
  const cases: Array<{
    name: string;
    factory: (msg?: string) => HTTPException;
    status: number;
    defaultMessage?: string;
  }> = [
    { name: "BadRequest", factory: (m) => BadRequest(m || "bad"), status: 400 },
    {
      name: "Unauthorized",
      factory: (m) => Unauthorized(m),
      status: 401,
      defaultMessage: "Unauthorized",
    },
    {
      name: "Forbidden",
      factory: (m) => Forbidden(m),
      status: 403,
      defaultMessage: "Forbidden",
    },
    { name: "NotFound", factory: (m) => NotFound(m || "missing"), status: 404 },
    {
      name: "Conflict",
      factory: (m) => Conflict(m || "conflict"),
      status: 409,
    },
    {
      name: "UnprocessableEntity",
      factory: (m) => UnprocessableEntity(m || "invalid"),
      status: 422,
    },
    {
      name: "TooManyRequests",
      factory: (m) => TooManyRequests(m),
      status: 429,
      defaultMessage: "Too many requests",
    },
    {
      name: "InternalServerError",
      factory: (m) => InternalServerError(m),
      status: 500,
      defaultMessage: "Internal server error",
    },
  ];

  it.each(cases)(
    "$name creates HTTPException with correct status and message",
    async ({ factory, status }) => {
      const message = "custom message";
      const err = factory(message);
      expect(err).toBeInstanceOf(HTTPException);

      const res = err.getResponse();
      expect(res.status).toBe(status);

      const text = await res.text();
      expect(text).toContain(message);
    }
  );

  it.each(cases.filter((c) => c.defaultMessage))(
    "$name uses default message when not provided",
    async ({ factory, status, defaultMessage }) => {
      const err = factory(undefined);
      expect(err).toBeInstanceOf(HTTPException);

      const res = err.getResponse();
      expect(res.status).toBe(status);

      const text = await res.text();
      if (defaultMessage) {
        expect(text).toContain(defaultMessage);
      }
    }
  );
});
