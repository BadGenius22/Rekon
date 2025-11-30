import type { Context } from "hono";
import { z } from "zod";
import { placeTrade } from "../services/trade-placement";
import { getSessionFromContext } from "../middleware/session";
import { BadRequest } from "../utils/http-errors";
import type { TradePlacementRequest } from "@rekon/types";

/**
 * Trade Placement Controllers
 *
 * Request/response handling for the unified trade placement endpoint.
 */

/**
 * Zod schema for trade placement request.
 */
const TradePlacementSchema = z
  .object({
    marketId: z.string().min(1, "Market ID is required"),
    side: z.enum(["yes", "no"], {
      errorMap: () => ({ message: "Side must be 'yes' or 'no'" }),
    }),
    size: z
      .number()
      .positive("Size must be greater than 0")
      .refine((val) => val >= 0.01, {
        message: "Size must be at least 0.01",
      }),
    price: z
      .number()
      .min(0, "Price must be >= 0")
      .max(1, "Price must be <= 1")
      .optional(),
    slippage: z
      .number()
      .min(0, "Slippage must be >= 0")
      .max(1, "Slippage must be <= 1")
      .optional(),
    timeInForce: z.enum(["GTC", "IOC", "FOK", "FAK", "GTD"]).optional(),
    expireTime: z.string().datetime().optional(),
    reduceOnly: z.boolean().optional(),
    postOnly: z.boolean().optional(),
    signedOrder: z
      .object({
        order: z.any(), // Raw CLOB order payload (required)
        signatureType: z.enum(["0", "1"]).optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // expireTime is required for GTD orders
      if (data.timeInForce === "GTD" && !data.expireTime) {
        return false;
      }
      return true;
    },
    {
      message: "expireTime is required for GTD orders",
      path: ["expireTime"],
    }
  );

/**
 * POST /trade/place
 *
 * Unified endpoint for placing trades.
 * Called by frontend when user clicks "Buy YES" or "Sell NO".
 *
 * Handles:
 * - Input validation
 * - Market + token resolution
 * - CLOB order construction
 * - Signing (user-signed or builder-signed)
 * - Posting to Polymarket
 * - Returning execution info
 */
export async function placeTradeController(c: Context) {
  const body = await c.req.json();
  const validated = TradePlacementSchema.parse(body);

  // Get session for attribution
  const session = getSessionFromContext(c);

  // Convert to TradePlacementRequest (ensures signedOrder.order is required if signedOrder exists)
  const request: TradePlacementRequest = {
    marketId: validated.marketId,
    side: validated.side,
    size: validated.size,
    price: validated.price,
    slippage: validated.slippage,
    timeInForce: validated.timeInForce,
    expireTime: validated.expireTime,
    reduceOnly: validated.reduceOnly,
    postOnly: validated.postOnly,
    signedOrder: validated.signedOrder
      ? {
          order: validated.signedOrder.order, // Required if signedOrder is provided
          signatureType: validated.signedOrder.signatureType,
        }
      : undefined,
  };

  // Place trade using unified pipeline
  const response = await placeTrade(request, session);

  return c.json(response, 201);
}

