import type { FunnelStage } from "@/lib/constants/customer-journey";
import {
  JOURNEY_ABANDON_AFTER_CHECKOUT_HOURS,
  JOURNEY_ABANDON_AFTER_VIEW_HOURS,
} from "@/lib/constants/customer-journey";

const STAGE_RANK: Record<FunnelStage, number> = {
  viewed: 0,
  checkout_clicked: 1,
  checkout_started: 2,
  payment_prepared: 3,
  booking_confirmed: 4,
  booking_changed: 5,
  booking_cancelled: 6,
  abandoned: -1,
};

const POST_BOOKING_STAGES = new Set<FunnelStage>([
  "booking_confirmed",
  "booking_changed",
  "booking_cancelled",
]);

/** Returns true when `next` should replace `current` on the interest row. */
export function shouldAdvanceFunnelStage(current: string, next: FunnelStage): boolean {
  if (next === "booking_cancelled") return current !== "booking_cancelled";
  if (next === "booking_changed") {
    return current === "booking_confirmed" || current === "booking_changed";
  }
  if (next === "booking_confirmed") {
    return !POST_BOOKING_STAGES.has(current as FunnelStage);
  }
  if (POST_BOOKING_STAGES.has(current as FunnelStage)) return false;
  const curRank = STAGE_RANK[current as FunnelStage];
  const nextRank = STAGE_RANK[next];
  if (curRank === undefined || nextRank === undefined) return true;
  return nextRank > curRank;
}

export function funnelStageRank(stage: string): number {
  return STAGE_RANK[stage as FunnelStage] ?? -2;
}

export function isAbandonedInterest(row: {
  funnel_stage: string;
  converted_booking_id: string | null;
  last_seen_at: Date;
}): boolean {
  if (row.converted_booking_id) return false;
  if (
    row.funnel_stage === "booking_confirmed" ||
    row.funnel_stage === "booking_changed" ||
    row.funnel_stage === "booking_cancelled"
  ) {
    return false;
  }

  const ageMs = Date.now() - row.last_seen_at.getTime();
  const checkoutStages = new Set(["checkout_started", "payment_prepared"]);
  const thresholdMs = checkoutStages.has(row.funnel_stage)
    ? JOURNEY_ABANDON_AFTER_CHECKOUT_HOURS * 60 * 60 * 1000
    : JOURNEY_ABANDON_AFTER_VIEW_HOURS * 60 * 60 * 1000;

  return ageMs >= thresholdMs;
}
