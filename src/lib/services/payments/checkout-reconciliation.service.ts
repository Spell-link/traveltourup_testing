import "server-only";

import { checkoutPaymentRepository } from "@/lib/db/repositories/checkout-payment.repository";
import { voidStripePaymentIntent } from "@/lib/payments/stripe-capture.core";
import { getStripeClient } from "@/lib/payments/stripe-client";

const STALE_AUTH_MINUTES = 30;

function stripeDeps() {
  const stripe = getStripeClient();
  return {
    retrieve: async (id: string) => {
      const pi = await stripe.paymentIntents.retrieve(id);
      return { id: pi.id, status: pi.status, amount: pi.amount, currency: pi.currency };
    },
    capture: async (id: string) => {
      const pi = await stripe.paymentIntents.capture(id);
      return { id: pi.id, status: pi.status, amount: pi.amount, currency: pi.currency };
    },
    cancel: async (id: string) => {
      const pi = await stripe.paymentIntents.cancel(id);
      return { id: pi.id, status: pi.status, amount: pi.amount, currency: pi.currency };
    },
    sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
  };
}

/** Void stale authorized payments with no linked booking. Intended for cron/ops. */
export async function reconcileStaleStaysAuthorizations(): Promise<{ voided: number }> {
  const { prisma } = await import("@/lib/prisma");
  const cutoff = new Date(Date.now() - STALE_AUTH_MINUTES * 60 * 1000);
  const rows = await prisma.checkoutPaymentRecord.findMany({
    where: {
      product_type: "hotel",
      status: { in: ["prepared", "requires_capture"] },
      booking_id: null,
      created_at: { lt: cutoff },
    },
    take: 50,
  });

  let voided = 0;
  const deps = stripeDeps();
  for (const row of rows) {
    try {
      await voidStripePaymentIntent(deps, row.provider_intent_id);
      await checkoutPaymentRepository.updateStatus(row.id, "voided");
      voided += 1;
    } catch {
      // skip row; ops can investigate
    }
  }
  return { voided };
}
