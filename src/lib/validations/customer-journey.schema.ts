import { z } from "zod";
import {
  FUNNEL_STAGES,
  JOURNEY_EVENT_TYPES,
  JOURNEY_PRODUCT_TYPES,
} from "@/lib/constants/customer-journey";

export const journeyTripSnapshotSchema = z.object({
  version: z.number().int().optional(),
  product_type: z.enum(JOURNEY_PRODUCT_TYPES),
  product_ref: z.string().min(1).max(512),
  origin_code: z.string().max(16).optional(),
  origin_label: z.string().max(128).optional(),
  destination_code: z.string().max(16).optional(),
  destination_label: z.string().max(128).optional(),
  start_date: z.string().max(10).optional(),
  end_date: z.string().max(10).optional(),
  trip_type: z.enum(["one_way", "round_trip", "multi_city"]).optional(),
  adults: z.number().int().min(0).max(99).optional(),
  children: z.number().int().min(0).max(99).optional(),
  infants: z.number().int().min(0).max(99).optional(),
  rooms: z.number().int().min(0).max(99).optional(),
  cabin_class: z.string().max(32).optional(),
  airline: z.string().max(128).optional(),
  hotel_name: z.string().max(256).optional(),
  location_label: z.string().max(256).optional(),
  room_name: z.string().max(256).optional(),
  nights: z.number().int().min(0).max(999).optional(),
  price_amount: z.string().max(24).optional(),
  price_currency: z.string().max(3).optional(),
  detail_path: z.string().max(1024).optional(),
  search_session_id: z.string().max(64).optional(),
  quote_id: z.string().max(128).optional(),
  offer_expires_at: z.string().max(64).optional(),
});

export const journeyEventBodySchema = z.object({
  event_type: z.enum(JOURNEY_EVENT_TYPES),
  product_type: z.enum(JOURNEY_PRODUCT_TYPES),
  product_ref: z.string().min(1).max(512),
  stage: z.enum(FUNNEL_STAGES),
  properties: z.record(z.string(), z.unknown()).optional(),
  client_event_id: z.string().uuid().optional(),
  title: z.string().max(500).optional(),
  subtitle: z.string().max(500).optional(),
  price_amount: z.string().max(24).optional(),
  price_currency: z.string().max(3).optional(),
  search_context: z.record(z.string(), z.unknown()).optional(),
  trip_snapshot: journeyTripSnapshotSchema.partial().optional(),
  preserve_stage: z.boolean().optional(),
});

export const adminJourneyInterestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  stage: z.enum(FUNNEL_STAGES).optional(),
  product_type: z.enum(JOURNEY_PRODUCT_TYPES).optional(),
  abandoned_only: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z
    .enum(["last_seen_at", "first_seen_at", "funnel_stage", "start_date"])
    .default("last_seen_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
