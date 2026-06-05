import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/error-handler";
import { AppError } from "@/lib/api/errors";
import { checkoutPaymentRepository } from "@/lib/db/repositories/checkout-payment.repository";
import { getStripeClient, isStripeConfigured } from "@/lib/payments/stripe-client";

export const dynamic = "force-dynamic";

function mapStripeStatus(status: string): string {
  if (status === "requires_capture") return "requires_capture";
  if (status === "succeeded") return "captured";
  if (status === "canceled") return "voided";
  if (status === "requires_payment_method" || status === "requires_confirmation") return "prepared";
  return status;
}

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      throw new AppError(503, "Stripe is not configured.", "STRIPE_NOT_CONFIGURED");
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new AppError(503, "Stripe webhook secret is not configured.", "STRIPE_NOT_CONFIGURED");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new AppError(400, "Missing stripe-signature header.", "VALIDATION_ERROR");
    }

    const rawBody = await req.text();
    const stripe = getStripeClient();
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new AppError(400, "Invalid Stripe webhook signature.", "VALIDATION_ERROR");
    }

    if (event.type.startsWith("payment_intent.")) {
      const pi = event.data.object as { id?: string; status?: string };
      if (pi.id && pi.status) {
        const record = await checkoutPaymentRepository.findByProviderIntentId(pi.id);
        if (record) {
          await checkoutPaymentRepository.updateStatus(record.id, mapStripeStatus(pi.status));
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
