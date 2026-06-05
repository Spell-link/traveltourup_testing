"use client";

import { useCallback, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeError } from "@stripe/stripe-js";
import { Button } from "@/components/ui/Button";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type InnerProps = {
  onAuthorized: () => void | Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
  submitLabel?: string;
  returnUrl?: string;
};

function StripePaymentFormInner({
  onAuthorized,
  onError,
  disabled,
  submitLabel = "Pay & book",
  returnUrl,
}: InnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!stripe || !elements || disabled || busy) return;
    setBusy(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            returnUrl ??
            (typeof window !== "undefined" ? window.location.href : ""),
        },
        redirect: "if_required",
      });
      if (result.error) {
        onError(result.error.message ?? "Payment failed.");
        return;
      }
      const status = result.paymentIntent?.status;
      if (status === "requires_capture" || status === "succeeded") {
        await onAuthorized();
        return;
      }
      onError(`Unexpected payment status: ${status ?? "unknown"}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }, [stripe, elements, disabled, busy, onAuthorized, onError, returnUrl]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <div className="flex justify-end">
      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!stripe || !elements || disabled || busy}
        onClick={() => void handleSubmit()}
      >
        {busy ? "Processing…" : submitLabel}
      </Button>
      </div>
    </div>
  );
}

type Props = {
  clientSecret: string;
  onAuthorized: () => void | Promise<void>;
  onError: (err: StripeError | string) => void;
  disabled?: boolean;
  submitLabel?: string;
  returnUrl?: string;
};

export function StripePaymentForm({
  clientSecret,
  onAuthorized,
  onError,
  disabled,
  submitLabel,
  returnUrl,
}: Props) {
  if (!stripePromise) {
    return (
      <p className="text-sm text-destructive">
        Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripePaymentFormInner
        onAuthorized={onAuthorized}
        onError={(msg) => onError(msg)}
        disabled={disabled}
        submitLabel={submitLabel}
        returnUrl={returnUrl}
      />
    </Elements>
  );
}
