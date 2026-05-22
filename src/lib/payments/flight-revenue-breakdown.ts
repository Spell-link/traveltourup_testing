import { getFlightPaymentsConfig } from "@/config/flight-payments.config";

export type PitRevenueInput = {
  charge_amount: string;
  charge_currency: string;
  offer_amount: string;
  services_subtotal_amount?: string | null;
  markup_amount: string;
  subtotal_charged_amount?: string | null;
  duffel_payments_fee_amount?: string | null;
  duffel_payments_fee_rate?: string | null;
};

export type FlightRevenueBreakdown = {
  customer_paid: string;
  duffel_cost: string;
  commission: string;
  duffel_payment_fee: string;
  currency: string;
  /** True when fee was estimated from env (legacy PIT rows). */
  estimated: boolean;
  net_commission?: string;
};

export type FlightRevenueRefundContext = {
  booking_status: string;
  cancellation_refund_amount?: string | null;
  card_refund_amount?: string | null;
};

function parseMajor(value: string | null | undefined, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function addMajor(a: string, b: string): string {
  return round2(parseMajor(a) + parseMajor(b));
}

/**
 * Derive Duffel Payments fee from persisted snapshot or estimate for legacy rows.
 */
export function resolveDuffelPaymentFee(pit: PitRevenueInput): { fee: string; estimated: boolean } {
  if (pit.duffel_payments_fee_amount != null && pit.duffel_payments_fee_amount !== "") {
    return { fee: pit.duffel_payments_fee_amount, estimated: false };
  }
  if (pit.subtotal_charged_amount != null && pit.subtotal_charged_amount !== "") {
    const fee = parseMajor(pit.charge_amount) - parseMajor(pit.subtotal_charged_amount);
    return { fee: round2(Math.max(0, fee)), estimated: false };
  }
  const charge = parseMajor(pit.charge_amount);
  const duffelCost = parseMajor(pit.offer_amount) + parseMajor(pit.services_subtotal_amount);
  const markup = parseMajor(pit.markup_amount);
  const rate =
    pit.duffel_payments_fee_rate != null
      ? parseMajor(pit.duffel_payments_fee_rate)
      : getFlightPaymentsConfig().duffelPaymentsFeeRate;
  if (rate >= 1) {
    return { fee: "0.00", estimated: true };
  }
  const subtotal = duffelCost + markup;
  const estimatedCharge = subtotal / (1 - rate);
  const fee = Math.max(0, estimatedCharge - subtotal);
  return { fee: round2(fee), estimated: true };
}

/** Per-order revenue slice from a succeeded (or captured) PaymentIntent snapshot. */
export function computeFlightRevenueFromPit(
  pit: PitRevenueInput,
  refundContext?: FlightRevenueRefundContext,
): FlightRevenueBreakdown {
  const duffel_cost = addMajor(pit.offer_amount, pit.services_subtotal_amount ?? "0");
  const { fee, estimated } = resolveDuffelPaymentFee(pit);
  const base: FlightRevenueBreakdown = {
    customer_paid: pit.charge_amount,
    duffel_cost,
    commission: pit.markup_amount,
    duffel_payment_fee: fee,
    currency: pit.charge_currency,
    estimated,
  };

  if (!refundContext) return base;

  const commissionN = parseMajor(pit.markup_amount);
  const customerN = parseMajor(pit.charge_amount);
  const cardRefund = parseMajor(refundContext.card_refund_amount);
  const balanceCredit = parseMajor(refundContext.cancellation_refund_amount);

  if (
    refundContext.booking_status === "cancelled" ||
    cardRefund > 0 ||
    balanceCredit > 0
  ) {
    const retained = Math.max(0, customerN - cardRefund - balanceCredit);
    const net = Math.max(0, Math.min(commissionN, commissionN - Math.max(0, retained - parseMajor(duffel_cost) - parseMajor(fee))));
    return { ...base, net_commission: round2(net) };
  }

  return { ...base, net_commission: pit.markup_amount };
}

export type ReconciliationLineType = "order" | "fees" | "payment" | "order_cancelled" | "refund";

export type ReconciliationLine = {
  type: ReconciliationLineType;
  label: string;
  reference: string | null;
  description: string;
  amount: string;
  currency: string;
  /** Signed impact on merchant balance (negative = debit). */
  balance_impact: string;
  at: string;
};
