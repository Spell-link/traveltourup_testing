import { describe, expect, it } from "vitest";
import {
  funnelStageRank,
  isAbandonedInterest,
  shouldAdvanceFunnelStage,
} from "@/lib/services/journey/customer-journey.core";

describe("shouldAdvanceFunnelStage", () => {
  it("advances from viewed to checkout_clicked", () => {
    expect(shouldAdvanceFunnelStage("viewed", "checkout_clicked")).toBe(true);
  });

  it("does not regress from payment_prepared to checkout_clicked", () => {
    expect(shouldAdvanceFunnelStage("payment_prepared", "checkout_clicked")).toBe(false);
  });

  it("always accepts booking_confirmed unless already post-booking", () => {
    expect(shouldAdvanceFunnelStage("payment_prepared", "booking_confirmed")).toBe(true);
    expect(shouldAdvanceFunnelStage("booking_confirmed", "payment_prepared")).toBe(false);
    expect(shouldAdvanceFunnelStage("booking_confirmed", "booking_confirmed")).toBe(false);
    expect(shouldAdvanceFunnelStage("booking_changed", "checkout_started")).toBe(false);
  });

  it("allows booking_changed after confirmation", () => {
    expect(shouldAdvanceFunnelStage("booking_confirmed", "booking_changed")).toBe(true);
    expect(shouldAdvanceFunnelStage("booking_changed", "booking_changed")).toBe(true);
  });

  it("allows booking_cancelled as terminal stage", () => {
    expect(shouldAdvanceFunnelStage("booking_confirmed", "booking_cancelled")).toBe(true);
    expect(shouldAdvanceFunnelStage("booking_changed", "booking_cancelled")).toBe(true);
    expect(shouldAdvanceFunnelStage("booking_cancelled", "booking_changed")).toBe(false);
  });

  it("ranks stages monotonically", () => {
    expect(funnelStageRank("viewed")).toBeLessThan(funnelStageRank("checkout_started"));
    expect(funnelStageRank("checkout_started")).toBeLessThan(funnelStageRank("payment_prepared"));
    expect(funnelStageRank("payment_prepared")).toBeLessThan(funnelStageRank("booking_confirmed"));
  });
});

describe("isAbandonedInterest", () => {
  it("treats stale checkout as abandoned", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(
      isAbandonedInterest({
        funnel_stage: "checkout_started",
        converted_booking_id: null,
        last_seen_at: threeHoursAgo,
      }),
    ).toBe(true);
  });

  it("does not abandon converted interests", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(
      isAbandonedInterest({
        funnel_stage: "checkout_started",
        converted_booking_id: "bk_1",
        last_seen_at: threeHoursAgo,
      }),
    ).toBe(false);
  });

  it("does not abandon cancelled interests", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(
      isAbandonedInterest({
        funnel_stage: "booking_cancelled",
        converted_booking_id: "bk_1",
        last_seen_at: threeHoursAgo,
      }),
    ).toBe(false);
  });
});
