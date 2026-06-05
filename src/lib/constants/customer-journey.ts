/** Funnel stages — monotonic except `abandoned` (derived for reporting). */
export const FUNNEL_STAGES = [
  "viewed",
  "checkout_clicked",
  "checkout_started",
  "payment_prepared",
  "booking_confirmed",
  "booking_changed",
  "booking_cancelled",
  "abandoned",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const JOURNEY_EVENT_TYPES = [
  "product.viewed",
  "product.enriched",
  "checkout.clicked",
  "checkout.started",
  "payment.prepared",
  "booking.confirmed",
  "booking.change_started",
  "booking.changed",
  "booking.cancelled",
] as const;

export type JourneyEventType = (typeof JOURNEY_EVENT_TYPES)[number];

export const JOURNEY_PRODUCT_TYPES = ["flight", "hotel", "car"] as const;

export type JourneyProductType = (typeof JOURNEY_PRODUCT_TYPES)[number];

/** Hours after `checkout_started` / `payment_prepared` before admin treats as abandoned. */
export const JOURNEY_ABANDON_AFTER_CHECKOUT_HOURS = 2;

/** Hours after early funnel stages before admin treats as abandoned. */
export const JOURNEY_ABANDON_AFTER_VIEW_HOURS = 24;
