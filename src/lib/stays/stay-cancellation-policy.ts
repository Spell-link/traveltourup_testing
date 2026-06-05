import type { StaysCancellationStep } from "@/lib/api/stays-dto";

export type StayCancellationRefundEstimate = {
  refundAmount: string | null;
  refundCurrency: string | null;
  policySummary: string;
  nonRefundable: boolean;
  /** Label for UI — estimate only until Duffel confirms on cancel. */
  isEstimate: true;
};

function parseAmount(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Given Duffel `cancellation_timeline` steps, returns the refund tier that applies at `now`.
 * Each step: cancel before `before` → receive `refund_amount`.
 * Steps are sorted by `before` ascending; first step where `now < before` wins.
 */
export function refundFromCancellationTimeline(
  timeline: StaysCancellationStep[],
  totalAmount: string | null,
  totalCurrency: string | null,
  now: Date = new Date(),
): { amount: string | null; currency: string | null } {
  if (!timeline.length) {
    return { amount: null, currency: totalCurrency };
  }

  const sorted = [...timeline].sort(
    (a, b) => new Date(a.before).getTime() - new Date(b.before).getTime(),
  );

  for (const step of sorted) {
    const deadline = new Date(step.before);
    if (Number.isNaN(deadline.getTime())) continue;
    if (now.getTime() < deadline.getTime()) {
      return {
        amount: step.refund_amount,
        currency: step.currency ?? totalCurrency,
      };
    }
  }

  const last = sorted[sorted.length - 1];
  return {
    amount: last?.refund_amount ?? "0",
    currency: last?.currency ?? totalCurrency,
  };
}

export function summarizeCancellationPolicy(
  timeline: StaysCancellationStep[],
  totalAmount: string | null,
  totalCurrency: string | null,
): string {
  if (!timeline.length) {
    return "No refundable window in the rate data — treat as non-refundable unless your contract says otherwise.";
  }

  const total = parseAmount(totalAmount);
  const fullRefund = total != null && timeline.some((t) => parseAmount(t.refund_amount) === total);
  const zeroOnly =
    timeline.every((t) => {
      const a = parseAmount(t.refund_amount);
      return a == null || a <= 0;
    }) &&
    (!total || total <= 0);

  if (zeroOnly || (!fullRefund && timeline.length === 1 && parseAmount(timeline[0]?.refund_amount) === 0)) {
    return "Non-refundable — you have chosen a non-refundable rate. If you cancel this booking, you will not receive any refund.";
  }

  if (fullRefund) {
    return "Partially or fully refundable — see the cancellation timeline for refund amounts by deadline.";
  }

  return "Partially refundable — refund amount depends on when you cancel. See the timeline below.";
}

export function evaluateStayCancellationRefund(input: {
  cancellationTimeline: StaysCancellationStep[];
  totalAmount: string | null;
  totalCurrency: string | null;
  now?: Date;
}): StayCancellationRefundEstimate {
  const now = input.now ?? new Date();
  const { amount, currency } = refundFromCancellationTimeline(
    input.cancellationTimeline,
    input.totalAmount,
    input.totalCurrency,
    now,
  );

  const policySummary = summarizeCancellationPolicy(
    input.cancellationTimeline,
    input.totalAmount,
    input.totalCurrency,
  );

  const refundNum = parseAmount(amount);
  const totalNum = parseAmount(input.totalAmount);
  const nonRefundable =
    refundNum == null ||
    refundNum <= 0 ||
    (totalNum != null && totalNum > 0 && refundNum <= 0);

  return {
    refundAmount: amount,
    refundCurrency: currency,
    policySummary,
    nonRefundable,
    isEstimate: true,
  };
}
