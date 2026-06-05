import { z } from "zod";
import { e164PhoneSchema } from "@/lib/validations/phone.schema";
import {
  checkoutPaymentRecordIdSchema,
  checkoutPricingBreakdownSchema,
  customerCurrencySchema,
  duffelQuoteIdSchema,
} from "@/lib/validations/checkout-payment.schema";

/**
 * Stays request bodies aligned with Duffel Stays APIs.
 * Product extensions (see Duffel docs): `negotiated_rate_ids` on search; loyalty programme ids /
 * corporate negotiated content on booking; richer guest objects when required.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

function trimName(value: string): string {
  return value.trim();
}

function isNotFutureDate(ymd: string): boolean {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  return d.getTime() <= today.getTime();
}

function ageYearsAt(bornOn: string, atYmd: string): number {
  const b = new Date(`${bornOn}T12:00:00.000Z`);
  const a = new Date(`${atYmd}T12:00:00.000Z`);
  let age = a.getUTCFullYear() - b.getUTCFullYear();
  const m = a.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && a.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}

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
  given_name: z
    .string()
    .min(1)
    .max(80)
    .transform(trimName)
    .refine((s) => s.length > 0, "Given name is required"),
  family_name: z
    .string()
    .min(1)
    .max(80)
    .transform(trimName)
    .refine((s) => s.length > 0, "Family name is required"),
  born_on: isoDate.refine(isNotFutureDate, "Date of birth cannot be in the future").optional(),
});

/** Lenient guest/contact fields for inline UI validation before prepare. */
export const staysCheckoutGuestFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  phone_number: z.string().trim().min(1, "Phone number is required"),
  guests: z.array(staysGuestBookingSchema).min(1),
  accommodation_special_requests: z.string().max(500).optional(),
});

/** Strict guest/contact for prepare + book API calls. */
export const staysCheckoutGuestSchema = z.object({
  email: z.string().trim().email().max(128),
  phone_number: e164PhoneSchema,
  guests: z
    .array(staysGuestBookingSchema)
    .min(1)
    .superRefine((guests, ctx) => {
      const lead = guests[0];
      if (!lead) return;
      if (!lead.born_on) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Lead guest date of birth is required.",
          path: [0, "born_on"],
        });
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (ageYearsAt(lead.born_on, today) < 18) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Lead guest must be at least 18 years old.",
          path: [0, "born_on"],
        });
      }
    }),
  accommodation_special_requests: z.string().max(500).optional(),
  loyalty_programme_account_number: z.string().min(1).max(64).optional(),
});

export const staysCheckoutPrepareBodySchema = z.object({
  quote_id: duffelQuoteIdSchema,
  /** When the stored quote expired, server can create a fresh quote from this rate before Stripe prepare. */
  rate_id: z.string().min(1).max(128).optional(),
  customer_currency: customerCurrencySchema.optional(),
});

export type StaysCheckoutPrepareBodyInput = z.infer<typeof staysCheckoutPrepareBodySchema>;

export const staysCheckoutPrepareResponseSchema = z.object({
  checkout_payment_id: checkoutPaymentRecordIdSchema,
  client_secret: z.string().min(1),
  pricing: checkoutPricingBreakdownSchema,
  expires_at: z.string().nullable(),
  quote_id: duffelQuoteIdSchema,
});

export type StaysCheckoutPrepareResponse = z.infer<typeof staysCheckoutPrepareResponseSchema>;

export const staysBookingBodySchema = staysCheckoutGuestSchema.extend({
  quote_id: duffelQuoteIdSchema,
  checkout_payment_id: checkoutPaymentRecordIdSchema,
  /** Used to recover when Duffel reports `rate_unavailable` on book (client should refresh quote before pay). */
  rate_id: z.string().min(1).max(128).optional(),
  /** Optional stay dates from checkout session (persisted on booking for confirmation email). */
  check_in_date: isoDate.optional(),
  check_out_date: isoDate.optional(),
  loyalty_programme_account_number: z.string().min(1).max(64).optional(),
});

export type StaysBookingBodyInput = z.infer<typeof staysBookingBodySchema>;

export const staysBookingCancelBodySchema = z.object({
  action: z.literal("confirm"),
});

export type StaysBookingCancelBodyInput = z.infer<typeof staysBookingCancelBodySchema>;
