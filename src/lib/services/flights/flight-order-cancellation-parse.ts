/**
 * Parse cancellation refund fields from a Duffel order resource (webhook or GET order).
 */

export type ParsedOrderEmbeddedCancellation = {
  duffelCancellationId: string | null;
  refundAmount: string | null;
  refundCurrency: string | null;
  refundTo: string | null;
  confirmedAt: Date | null;
  quoteExpiresAt: Date | null;
};

function parseIsoDate(s: unknown): Date | null {
  if (typeof s !== "string" || !s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseCancellationFromDuffelOrder(
  order: Record<string, unknown>,
): ParsedOrderEmbeddedCancellation | null {
  const cancel = order.cancellation;
  if (!cancel || typeof cancel !== "object") return null;
  const c = cancel as Record<string, unknown>;
  const id = typeof c.id === "string" ? c.id : null;
  const refundAmount = typeof c.refund_amount === "string" ? c.refund_amount : null;
  const refundCurrency = typeof c.refund_currency === "string" ? c.refund_currency : null;
  const refundTo = typeof c.refund_to === "string" ? c.refund_to : null;
  const confirmedAt = parseIsoDate(c.confirmed_at);
  if (!confirmedAt && order.cancelled_at == null) {
    return null;
  }
  return {
    duffelCancellationId: id?.startsWith("ore_") ? id : null,
    refundAmount,
    refundCurrency,
    refundTo,
    confirmedAt: confirmedAt ?? parseIsoDate(order.cancelled_at),
    quoteExpiresAt: parseIsoDate(c.expires_at),
  };
}
