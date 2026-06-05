"use client";

import { XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { summarizeStaysCancellationPolicy } from "@/lib/stays/stays-cancellation-summary";
import type { StaysQuoteSession } from "@/lib/stays/stays-quote-session";
import { cn } from "@/lib/utils";

type Props = {
  session: StaysQuoteSession | null;
};

export function HotelCheckoutCancellationPolicy({ session }: Props) {
  const t = useTranslations("Hotels.checkout");
  const locale = useLocale();
  const { formatPrice } = useCurrency();

  const summary = summarizeStaysCancellationPolicy({
    timeline: session?.cancellation_timeline,
    totalAmount: session?.total_amount ?? null,
    currency: session?.currency ?? null,
    formatMoney: (amount, currency) => formatPrice(amount, currency, locale),
  });

  return (
    <div
      className={cn(
        "rounded-xl border p-4 md:p-5",
        summary.variant === "non_refundable"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-card/80",
      )}
    >
      <div className="flex gap-3">
        {summary.variant === "non_refundable" ? (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        ) : null}
        <div>
          <h3 className="text-sm font-bold text-foreground">{t("cancellationPolicyTitle")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{summary.message}</p>
        </div>
      </div>
    </div>
  );
}
