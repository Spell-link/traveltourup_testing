"use client";

import { useLocale, useTranslations } from "next-intl";

import { useCurrency } from "@/components/providers/CurrencyProvider";
import type { StaysBookingBillingDisplay } from "@/lib/stays/stays-booking-display";

type Props = {
  billing: StaysBookingBillingDisplay;
  paidAt?: string | null;
  className?: string;
};

function money(
  amount: string | null | undefined,
  currency: string,
  formatPrice: (n: number, c: string, l: string) => string,
  locale: string,
): string | null {
  if (!amount) return null;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? formatPrice(n, currency, locale) : `${currency} ${amount}`;
}

function positiveAmount(amount: string | null | undefined): boolean {
  const n = Number.parseFloat(amount ?? "");
  return Number.isFinite(n) && n > 0;
}

export function HotelOrderBillingSummary({ billing, paidAt, className }: Props) {
  const locale = useLocale();
  const tDetail = useTranslations("Hotels.bookingDetail");
  const tCheckout = useTranslations("Hotels.checkout");
  const { formatPrice } = useCurrency();

  const paidCur = (billing.totalPaidCurrency ?? billing.totalCurrency).toUpperCase();
  const roomCur = (billing.supplierCurrency ?? billing.roomCurrency ?? paidCur).toUpperCase();

  const roomDisplay = money(
    billing.supplierAmount ?? billing.roomAmount,
    roomCur,
    formatPrice,
    locale,
  );
  const feeN = Number.parseFloat(billing.serviceFeeAmount ?? "0");
  const feeDisplay =
    Number.isFinite(feeN) && feeN > 0
      ? money(billing.serviceFeeAmount, paidCur, formatPrice, locale)
      : null;
  const taxDisplay = billing.taxAmount ? money(billing.taxAmount, paidCur, formatPrice, locale) : null;
  const totalPaidDisplay =
    money(billing.totalPaidAmount ?? billing.customerChargeAmount, paidCur, formatPrice, locale) ??
    `${paidCur} ${billing.totalPaidAmount ?? billing.totalAmount}`;

  const dueCur = (billing.dueAtAccommodationCurrency ?? paidCur).toUpperCase();
  const dueDisplay = positiveAmount(billing.dueAtAccommodationAmount)
    ? money(billing.dueAtAccommodationAmount, dueCur, formatPrice, locale)
    : null;

  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {tDetail("billingHeading")}
      </h2>
      {paidAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {tDetail("paidOn", { date: new Date(paidAt).toLocaleDateString(locale) })}
        </p>
      ) : null}

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {tDetail("billingPayNowSection")}
      </p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground">
            <th className="pb-2 text-left font-medium">{tDetail("billingDescription")}</th>
            <th className="pb-2 text-right font-medium">{tDetail("billingPrice", { currency: paidCur })}</th>
          </tr>
        </thead>
        <tbody>
          {roomDisplay ? (
            <tr className="border-b border-border/40">
              <td className="py-2 text-foreground">{tCheckout("lineRoom")}</td>
              <td className="py-2 text-right text-foreground">{roomDisplay}</td>
            </tr>
          ) : null}
          {feeDisplay ? (
            <tr className="border-b border-border/40">
              <td className="py-2 text-foreground">{tCheckout("lineServiceFee")}</td>
              <td className="py-2 text-right text-foreground">{feeDisplay}</td>
            </tr>
          ) : null}
          {taxDisplay ? (
            <tr className="border-b border-border/40">
              <td className="py-2 text-foreground">{tDetail("billingTax")}</td>
              <td className="py-2 text-right text-foreground">{taxDisplay}</td>
            </tr>
          ) : null}
          <tr className="bg-muted/30">
            <td className="p-3 font-semibold text-foreground">
              {tDetail("billingTotalPaid", { currency: paidCur })}
            </td>
            <td className="p-3 text-right text-lg font-bold text-primary">{totalPaidDisplay}</td>
          </tr>
        </tbody>
      </table>

      {dueDisplay ? (
        <div className="mt-4 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tDetail("billingPayAtHotel")}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{dueDisplay}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tDetail("billingPayAtHotelNote")}</p>
        </div>
      ) : null}
    </section>
  );
}
