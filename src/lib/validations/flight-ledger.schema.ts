import { z } from "zod";
import {
  BOOKING_FINANCIAL_EVENT_TYPES,
} from "@/lib/constants/booking-states";
import { FLIGHT_LEDGER_DIRECTION_FILTERS } from "@/lib/services/flights/flight-financial-event-direction";

const optionalIsoDay = z
  .string()
  .optional()
  .refine(
    (s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s),
    "Use YYYY-MM-DD",
  );

export const myFlightLedgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.literal("created_at").default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  event_type: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.enum(BOOKING_FINANCIAL_EVENT_TYPES).optional(),
  ),
  direction: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.enum(FLIGHT_LEDGER_DIRECTION_FILTERS).optional(),
  ),
  from: optionalIsoDay,
  to: optionalIsoDay,
});

export const adminFlightLedgerQuerySchema = myFlightLedgerQuerySchema.extend({
  q: z.preprocess(
    (v) => (v === null || v === "" ? undefined : v),
    z.string().min(1).max(200).optional(),
  ),
});

export type MyFlightLedgerQuery = z.infer<typeof myFlightLedgerQuerySchema>;
export type AdminFlightLedgerQuery = z.infer<typeof adminFlightLedgerQuerySchema>;
