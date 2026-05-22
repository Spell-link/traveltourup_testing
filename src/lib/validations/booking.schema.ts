import { z } from "zod";
import { paginationQuerySchema } from "./pagination.schema";

/** Tighter list cap than generic pagination (heavy child rows even in “lite” mode). */
export const bookingQuerySchema = paginationQuerySchema
  .omit({ limit: true })
  .extend({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    /** Allow `null` (e.g. from `URLSearchParams` or JSON) — Zod `.optional()` alone rejects null. */
    status: z.preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.string().optional(),
    ),
    type: z.preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.string().optional(),
    ),
    q: z.preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      z.string().optional(),
    ),
    sort: z
      .enum(["created_at", "total_amount", "status", "booking_ref_no"])
      .default("created_at"),
    order: z.enum(["asc", "desc"]).default("desc"),
  });

const jsonPayload = z.record(z.string(), z.unknown()).optional();

export const createBookingSchema = z.object({
  type: z.string().min(1).transform((s) => s.toLowerCase()),
  status: z.string().optional().default("pending"),
  payment_status: z.string().optional().default("pending"),
  total_amount: z.coerce.number().nonnegative(),
  currency: z.string().length(3),
  guest_data: jsonPayload.nullable().optional(),
  flight_booking: z.object({ payload: jsonPayload }).optional(),
  hotel_booking: z.object({ payload: jsonPayload }).optional(),
  car_booking: z.object({ payload: jsonPayload }).optional(),
});

export const patchBookingSchema = z.object({
  status: z.string().min(1).optional(),
  payment_status: z.string().min(1).optional(),
});

export const bookingIdParamSchema = z.object({
  id: z.string().min(1),
});
