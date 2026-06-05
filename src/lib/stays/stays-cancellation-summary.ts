import type { StaysCancellationStep } from "@/lib/api/stays-dto";

function formatUtcBeforeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export type StaysCancellationSummaryInput = {
  timeline?: StaysCancellationStep[];
  totalAmount?: string | null;
  currency?: string | null;
  formatMoney?: (amount: number, currency: string) => string;
};

/**
 * Short policy line for checkout (non-refundable vs refundable window).
 */
export function summarizeStaysCancellationPolicy(input: StaysCancellationSummaryInput): {
  variant: "non_refundable" | "refundable" | "unknown";
  message: string;
} {
  const timeline = input.timeline ?? [];
  const total = input.totalAmount ?? null;
  const currency = (input.currency ?? "USD").toUpperCase();
  const fmt =
    input.formatMoney ??
    ((amount: number, cur: string) => `${cur} ${amount.toFixed(2)}`);

  if (!timeline.length) {
    return {
      variant: "unknown",
      message: "Cancellation terms apply. See your rate details for the full policy.",
    };
  }

  const first = timeline[0];
  const refundAmt = Number.parseFloat(first.refund_amount);
  const totalAmt = total != null ? Number.parseFloat(total) : NaN;
  const fullRefund =
    Number.isFinite(refundAmt) &&
    Number.isFinite(totalAmt) &&
    Math.abs(refundAmt - totalAmt) < 0.01;

  if (!Number.isFinite(refundAmt) || refundAmt <= 0) {
    return {
      variant: "non_refundable",
      message:
        "Non-refundable — You have chosen a non-refundable rate. If you cancel this booking, you will not receive a refund.",
    };
  }

  const refundDisp = Number.isFinite(refundAmt)
    ? fmt(refundAmt, (first.currency ?? currency).toUpperCase())
    : `${first.currency ?? currency} ${first.refund_amount}`;

  return {
    variant: fullRefund ? "refundable" : "refundable",
    message: `Until ${formatUtcBeforeLocal(first.before)}: refund ${refundDisp}. Later cancellations may receive less or no refund.`,
  };
}
