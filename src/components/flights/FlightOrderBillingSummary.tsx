"use client";

import { useLocale } from "next-intl";

import { useCurrency } from "@/components/providers/CurrencyProvider";

type Props = {
  totalAmount: string | number;
  currency: string;
  baseAmount?: string | null;
  taxAmount?: string | null;
  className?: string;
};

function money(
  amount: string | number,
  currency: string,
  formatPrice: (n: number, c: string, l: string) => string,
  locale: string,
): string {
  const n = Number.parseFloat(String(amount));
  return Number.isFinite(n) ? formatPrice(n, currency, locale) : `${currency} ${amount}`;
}

export function FlightOrderBillingSummary({
  totalAmount,
  currency,
  baseAmount,
  taxAmount,
  className,
}: Props) {
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const cur = currency.toUpperCase();
  const totalDisplay = money(totalAmount, cur, formatPrice, locale);
  const hasFareBreakdown =
    baseAmount != null &&
    taxAmount != null &&
    Number.isFinite(Number.parseFloat(String(baseAmount))) &&
    Number.isFinite(Number.parseFloat(String(taxAmount)));

  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Billing summary
      </h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground">
            <th className="pb-2 text-left font-medium">Description</th>
            <th className="pb-2 text-right font-medium">Price ({cur})</th>
          </tr>
        </thead>
        <tbody>
          {hasFareBreakdown ? (
            <>
              <tr className="border-b border-border/40">
                <td className="py-2 text-foreground">Fare</td>
                <td className="py-2 text-right text-foreground">
                  {money(baseAmount!, cur, formatPrice, locale)}
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-2 text-foreground">Fare taxes</td>
                <td className="py-2 text-right text-foreground">
                  {money(taxAmount!, cur, formatPrice, locale)}
                </td>
              </tr>
            </>
          ) : null}
          <tr className={hasFareBreakdown ? "bg-muted/30 " : undefined}>
            <td className="p-3 font-semibold text-foreground ">Total ({cur})</td>
            <td className="p-3 text-right text-lg font-bold text-primary">{totalDisplay}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
