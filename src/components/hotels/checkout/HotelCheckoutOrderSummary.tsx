"use client";

import { Building2, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { parseIsoCurrencyAmountLine } from "@/lib/currency/format-display";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { cn } from "@/lib/utils";
import type { StaysCheckoutPrepareResponse } from "@/lib/validations/stays.schema";
import type { StaysQuoteSession } from "@/lib/stays/stays-quote-session";

type BookingDetails = {
  type?: string;
  title?: string;
  price?: string;
  options?: { label: string; value: string }[];
  subtitle?: string;
};

type Props = {
  sticky?: boolean;
  bookingDetails: BookingDetails | null;
  staysQuoteSession: StaysQuoteSession | null;
  prepareResult: StaysCheckoutPrepareResponse | null;
  quoteId: string;
  currencyCode: string;
};

export function HotelCheckoutOrderSummary({
  sticky,
  bookingDetails,
  staysQuoteSession,
  prepareResult,
  quoteId,
  currencyCode,
}: Props) {
  const t = useTranslations("Hotels.checkout");
  const locale = useLocale();
  const { formatPrice } = useCurrency();

  const summaryBookingLine = (() => {
    const st = (bookingDetails?.type ?? "Hotel").toLowerCase();
    const cat =
      st === "hotel" ? t("summaryTypeHotel") : st === "car" ? t("summaryTypeCar") : t("summaryTypeFlight");
    return `${cat} ${t("summaryBookingWord")}`;
  })();

  const summaryTitle = staysQuoteSession?.hotel_name ?? bookingDetails?.title ?? t("defaultSummaryTitle");
  const chargePricing = prepareResult?.pricing;

  const payNowTotal = (() => {
    if (chargePricing) {
      const n = Number.parseFloat(chargePricing.customer_total);
      if (Number.isFinite(n)) return formatPrice(n, chargePricing.charge_currency, locale);
    }
    if (staysQuoteSession?.currency && staysQuoteSession?.total_amount) {
      const n = Number.parseFloat(staysQuoteSession.total_amount);
      if (Number.isFinite(n)) return formatPrice(n, staysQuoteSession.currency, locale);
    }
    const parsed = parseIsoCurrencyAmountLine(bookingDetails?.price);
    if (parsed) return formatPrice(parsed.amount, parsed.currency, locale);
    return bookingDetails?.price ?? "—";
  })();

  const showChargeBasis =
    chargePricing?.charge_currency_fallback &&
    chargePricing.charge_currency.toUpperCase() !== currencyCode.toUpperCase();

  const dueAtAcc = staysQuoteSession?.due_at_accommodation_amount;
  const dueAtCur = staysQuoteSession?.due_at_accommodation_currency;
  const dueAtDisplay =
    dueAtAcc && dueAtCur
      ? (() => {
          const n = Number.parseFloat(dueAtAcc);
          return Number.isFinite(n) ? formatPrice(n, dueAtCur, locale) : `${dueAtCur} ${dueAtAcc}`;
        })()
      : null;

  const partySubtitle = (() => {
    const adults = staysQuoteSession?.adults ?? 1;
    const children = staysQuoteSession?.children ?? 0;
    const room = staysQuoteSession?.room_name;
    return t("partySubtitle", { adults, children, room: room ?? t("defaultSummaryTitle") });
  })();

  const summaryOptions = bookingDetails?.options?.length
    ? bookingDetails.options
    : (() => {
        const rows: { label: string; value: string }[] = [];
        if (staysQuoteSession?.check_in && staysQuoteSession?.check_out) {
          rows.push({
            label: t("rowLabelStay"),
            value: `${staysQuoteSession.check_in} - ${staysQuoteSession.check_out}`,
          });
        }
        if (quoteId) rows.push({ label: t("rowLabelQuote"), value: quoteId });
        return rows;
      })();

  return (
    <div
      className={cn(
        "overflow-auto rounded-2xl border border-border bg-card shadow-sm dropdown-scrollbar max-h-[calc(100vh-6rem)]",
        sticky && "sticky top-24",
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted px-6 py-4">
        <Building2 className="shrink-0 text-xl text-primary" aria-hidden />
        <h3 className="text-lg font-bold text-foreground">{t("orderSummaryTitle")}</h3>
      </div>
      <div className="p-6">
        <div className="mb-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {summaryBookingLine}
          </p>
          <h4 className="text-xl font-bold text-foreground">{summaryTitle}</h4>
          {bookingDetails?.subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{bookingDetails.subtitle}</p>
          ) : null}
        </div>
        <div className="mb-2 space-y-2">
          {summaryOptions.map((opt, i) => (
            <div key={`${opt.label}-${i}`} className="flex justify-between gap-2 text-sm">
              <span className="text-start text-muted-foreground">{opt.label}</span>
              <span className="max-w-[55%] text-end font-medium text-foreground">{opt.value}</span>
            </div>
          ))}
        </div>

        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("payNowTitle")}
        </p>
        <div className="mb-4 space-y-2">
          {chargePricing ? (
            <>
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{t("lineRoom")}</span>
                <span className="font-medium">{`${chargePricing.supplier_currency} ${chargePricing.supplier_amount}`}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{t("lineServiceFee")}</span>
                <span className="font-medium">{chargePricing.markup_amount}</span>
              </div>
            </>
          ) : staysQuoteSession?.total_amount ? (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{t("lineRoom")}</span>
              <span className="font-medium">
                {`${staysQuoteSession.currency ?? "USD"} ${staysQuoteSession.total_amount}`}
              </span>
            </div>
          ) : null}
        </div>

        {dueAtDisplay ? (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("payAtAccommodationTitle")}
            </p>
            <div className="mb-4 flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{t("lineAccommodationFee")}</span>
              <span className="font-medium">{dueAtDisplay}</span>
            </div>
          </>
        ) : null}

        <hr className="my-2 border-border border-dashed" />
        <div className="mb-2 flex items-end justify-between gap-2">
          <span className="font-medium text-muted-foreground">{t("totalAmountLabel")}</span>
          <span className="text-3xl font-bold text-primary">{payNowTotal}</span>
        </div>
        {showChargeBasis && chargePricing ? (
          <p className="text-end text-xs text-muted-foreground">
            {t("chargeBasis", {
              charge: chargePricing.charge_currency,
              display: currencyCode,
            })}
          </p>
        ) : null}
        <p className="text-end text-xs text-muted-foreground">{t("includesRoomTaxes")}</p>
        <p className="mt-2 text-end text-xs text-muted-foreground">{partySubtitle}</p>
      </div>
      <div className="flex items-center justify-center gap-2 bg-muted px-6 py-4 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t("secureCheckout")}</span>
      </div>
    </div>
  );
}
