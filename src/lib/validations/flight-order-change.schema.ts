import { z } from "zod";

const sliceAddSchema = z.object({
  origin: z.string().min(3).max(8),
  destination: z.string().min(3).max(8),
  departure_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "departure_date must be ISO date (YYYY-MM-DD)"),
  cabin_class: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
});

const slicesBodySchema = z
  .object({
    add: z.array(sliceAddSchema).min(1).max(4).optional(),
    remove: z
      .array(z.object({ slice_id: z.string().min(1).max(64) }))
      .min(1)
      .max(4)
      .optional(),
  })
  .refine((s) => (s.add?.length ?? 0) > 0 || (s.remove?.length ?? 0) > 0, {
    message: "slices.add or slices.remove must be provided",
  });

const selectionBodySchema = z.object({
  selected_slice_id: z.string().min(1).max(64),
  departure_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "departure_date must be ISO date (YYYY-MM-DD)"),
  origin: z.string().min(3).max(8).optional(),
  destination: z.string().min(3).max(8).optional(),
  cabin_class: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
});

/**
 * Body for `POST /api/v1/flights/bookings/:id/order-changes` (quote).
 */
export const flightOrderChangeQuoteBodySchema = z.union([
  z.object({ slices: slicesBodySchema }).strict(),
  selectionBodySchema.strict(),
]);

export type FlightOrderChangeQuoteBody = z.infer<typeof flightOrderChangeQuoteBodySchema>;

export const flightOrderChangePaymentIntentBodySchema = z
  .object({
    order_change_offer_id: z.string().min(1).max(64),
  })
  .strict();

export type FlightOrderChangePaymentIntentBody = z.infer<
  typeof flightOrderChangePaymentIntentBodySchema
>;

/**
 * Body for `POST /api/v1/flights/bookings/:id/order-changes/:changeId/confirm`.
 */
export const flightOrderChangeConfirmBodySchema = z
  .object({
    order_change_offer_id: z.string().min(1).max(64),
    payment_intent_id: z.string().min(1).max(64).optional(),
  })
  .strict();

export type FlightOrderChangeConfirmBody = z.infer<typeof flightOrderChangeConfirmBodySchema>;
