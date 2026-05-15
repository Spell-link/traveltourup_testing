import { z } from "zod";

/**
 * Body for `POST /api/v1/flights/bookings/:id/order-changes` (Phase 1 — quote).
 * Mirrors Duffel `order_change_requests.slices`. Keep validation strict so
 * we never forward an empty change to Duffel.
 */
export const flightOrderChangeQuoteBodySchema = z
  .object({
    slices: z
      .object({
        add: z
          .array(
            z.object({
              origin: z.string().min(3).max(8),
              destination: z.string().min(3).max(8),
              departure_date: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, "departure_date must be ISO date (YYYY-MM-DD)"),
              cabin_class: z
                .enum(["economy", "premium_economy", "business", "first"])
                .optional(),
            }),
          )
          .min(1)
          .max(4)
          .optional(),
        remove: z
          .array(z.object({ slice_id: z.string().min(1).max(64) }))
          .min(1)
          .max(4)
          .optional(),
      })
      .refine(
        (s) => (s.add?.length ?? 0) > 0 || (s.remove?.length ?? 0) > 0,
        { message: "slices.add or slices.remove must be provided" },
      ),
  })
  .strict();

export type FlightOrderChangeQuoteBody = z.infer<typeof flightOrderChangeQuoteBodySchema>;

/**
 * Body for `POST /api/v1/flights/bookings/:id/order-changes/:changeId/confirm`.
 * The user has picked one of the offers Duffel returned.
 */
export const flightOrderChangeConfirmBodySchema = z
  .object({
    order_change_offer_id: z.string().min(1).max(64),
  })
  .strict();

export type FlightOrderChangeConfirmBody = z.infer<typeof flightOrderChangeConfirmBodySchema>;
