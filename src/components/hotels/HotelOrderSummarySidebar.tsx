"use client";

import { useLocale, useTranslations } from "next-intl";

import { useCurrency } from "@/components/providers/CurrencyProvider";
import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";

type Props = {
  bookingRefNo: string;
  status: string;
  paymentStatus: string;
  paymentStatusLabel?: string;
  display: StaysBookingDisplay;
  totalAmount: string | number;
  currency: string;
};

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "confirmed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (s === "cancelled") return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
  return "bg-muted text-muted-foreground";
}

export function HotelOrderSummarySidebar({
  bookingRefNo,
  status,
  paymentStatus,
  paymentStatusLabel,
  display,
  totalAmount,
  currency,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("Hotels.bookingDetail");
  const { formatPrice } = useCurrency();

  const totalN = Number.parseFloat(String(totalAmount));
  const totalDisplay = Number.isFinite(totalN)
    ? formatPrice(totalN, currency, locale)
    : `${currency} ${totalAmount}`;

  const guestSummary =
    display.guests.length > 0
      ? display.guests.map((g) => g.fullName).join(", ")
      : null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div
        className="flex items-center gap-4 border-b border-border bg-muted px-6 py-4"
        style={{ borderRadius: "12px 12px 0px 0px" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("summaryHeading")}
        </h2>
      </div>
      <dl className="space-y-2 p-4 text-sm">
        {display.bookingReference ? (
          <div>
            <dt className="text-muted-foreground">{t("hotelConfirmationLabel")}</dt>
            <dd className="mt-0.5 font-semibold text-foreground">{display.bookingReference}</dd>
          </div>
        ) : null}
        {display.duffelBookingId ? (
          <div>
            <dt className="text-muted-foreground">{t("duffelBookingIdLabel")}</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-foreground">{display.duffelBookingId}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">{t("ttuRefLabel")}</dt>
          <dd className="mt-0.5 font-medium text-foreground">{bookingRefNo}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("statusLabel")}</dt>
          <dd className="mt-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(status)}`}
            >
              {status}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("paymentLabel")}</dt>
          <dd className="mt-0.5 capitalize text-foreground">
            {paymentStatusLabel ?? paymentStatus.replace(/_/g, " ")}
          </dd>
        </div>
        {guestSummary ? (
          <div>
            <dt className="text-muted-foreground">{t("guestsLabel")}</dt>
            <dd className="mt-0.5 text-foreground">{guestSummary}</dd>
          </div>
        ) : null}
        {display.contactEmail || display.contactPhone ? (
          <div>
            <dt className="text-muted-foreground">{t("contactHeading")}</dt>
            <dd className="mt-0.5 text-foreground">
              {[display.contactEmail, display.contactPhone].filter(Boolean).join(" · ")}
            </dd>
          </div>
        ) : null}
        <div className="border-t border-border/40 pt-3">
          <dt className="text-muted-foreground">{t("totalLabel")}</dt>
          <dd className="mt-0.5 text-xl font-bold text-primary">{totalDisplay}</dd>
        </div>
        {display.confirmedAt ? (
          <div className="border-t border-border/40 pt-3">
            <dt className="text-muted-foreground">{t("timelineLabel")}</dt>
            <dd className="mt-2 text-xs text-muted-foreground">
              {t("bookedOn", {
                date: new Date(display.confirmedAt).toLocaleString(locale),
              })}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
