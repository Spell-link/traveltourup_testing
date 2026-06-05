"use client";

import { useLocale } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { useCurrency } from "@/components/providers/CurrencyProvider";
import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";

type Props = {
  display: StaysBookingDisplay;
};

function formatDeadline(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BookingHotelPolicyCards({ display }: Props) {
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const { cancellationTimeline, cancellationPolicySummary, billing } = display;
  const isNonRefundable =
    cancellationPolicySummary.toLowerCase().includes("non-refundable") ||
    (cancellationTimeline.length === 1 &&
      Number.parseFloat(cancellationTimeline[0]?.refund_amount ?? "0") <= 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Cancellation policy
      </h2>
      <div
        className={`mt-3 rounded-lg p-4 text-sm ${
          isNonRefundable
            ? "border border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
            : "border border-border/40 bg-muted/20 text-foreground"
        }`}
      >
        {isNonRefundable ? (
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{cancellationPolicySummary}</p>
          </div>
        ) : (
          <p>{cancellationPolicySummary}</p>
        )}
      </div>
      {cancellationTimeline.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {cancellationTimeline.map((step, i) => {
            const refundN = Number.parseFloat(step.refund_amount);
            const refundLabel = Number.isFinite(refundN)
              ? formatPrice(refundN, (step.currency ?? billing.totalCurrency).toUpperCase(), locale)
              : `${step.currency ?? billing.totalCurrency} ${step.refund_amount}`;
            return (
              <li
                key={`${step.before}-${i}`}
                className="flex flex-wrap justify-between gap-2 border-t border-border/40 pt-2 first:border-t-0 first:pt-0"
              >
                <span className="text-muted-foreground">
                  Cancel before {formatDeadline(step.before, locale)}
                </span>
                <span className="font-medium text-foreground">{refundLabel} refund</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
