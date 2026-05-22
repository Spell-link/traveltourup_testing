import { z } from "zod";

/** Accept `limit` or legacy `page_size` in URL before Zod parse. */
export function parseAdminListLimit(
  sp: Record<string, string | string[] | undefined>,
  first: (v: string | string[] | undefined) => string | undefined,
): string | undefined {
  return first(sp.limit) ?? first(sp.page_size);
}

export const adminFlightBookingListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "failed"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
  sort: z.enum(["created_at", "booking_ref_no", "status"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const adminFlightRevenueQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "failed"]).optional(),
  currency: z.string().length(3).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
  sort: z.enum(["created_at", "booking_ref_no", "status"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminFlightBookingListQuery = z.infer<typeof adminFlightBookingListQuerySchema>;

export const adminFlightWebhookListQuerySchema = z.object({
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
  sort: z.enum(["received_at", "type"]).default("received_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type AdminFlightWebhookListQuery = z.infer<typeof adminFlightWebhookListQuerySchema>;
