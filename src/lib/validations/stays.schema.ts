import { z } from "zod";

/**
 * Stays request bodies aligned with Duffel Stays APIs.
 * Product extensions (see Duffel docs): `negotiated_rate_ids` on search; loyalty programme ids /
 * corporate negotiated content on booking; richer guest objects when required.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const staysGuestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("adult") }),
  z.object({ type: z.literal("child"), age: z.number().int().min(0).max(17).optional() }),
]);

export const staysSearchBodySchema = z.object({
  check_in_date: isoDate,
  check_out_date: isoDate,
  rooms: z.number().int().min(1).max(9),
  guests: z.array(staysGuestSchema).min(1).max(20),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().positive().max(200),
  }),
});

export type StaysSearchBodyInput = z.infer<typeof staysSearchBodySchema>;

export const staysQuoteBodySchema = z.object({
  rate_id: z.string().min(1).max(128),
});

export const staysGuestBookingSchema = z.object({
  given_name: z.string().min(1).max(80),
  family_name: z.string().min(1).max(80),
  born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const staysBookingBodySchema = z.object({
  quote_id: z.string().min(1).max(128),
  payment: z.object({
    three_d_secure_session_id: z.string().min(1),
  }),
  email: z.string().email(),
  phone_number: z.string().min(1).max(32),
  guests: z.array(staysGuestBookingSchema).min(1),
  accommodation_special_requests: z.string().max(500).optional(),
});

export type StaysBookingBodyInput = z.infer<typeof staysBookingBodySchema>;
