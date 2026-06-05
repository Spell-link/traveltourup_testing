"use client";

import { useTranslations } from "next-intl";

import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";

type Props = {
  display: StaysBookingDisplay;
};

export function BookingHotelAdditionalSection({ display }: Props) {
  const t = useTranslations("Hotels.bookingDetail");
  const { specialRequests, loyaltyProgrammeAccountNumber } = display;

  if (!specialRequests && !loyaltyProgrammeAccountNumber) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("additionalHeading")}
      </h2>
      <dl className="mt-4 space-y-4 text-sm">
        {specialRequests ? (
          <div>
            <dt className="text-muted-foreground">{t("specialRequestsLabel")}</dt>
            <dd className="mt-1 text-foreground">{specialRequests}</dd>
          </div>
        ) : null}
        {loyaltyProgrammeAccountNumber ? (
          <div>
            <dt className="text-muted-foreground">{t("loyaltyLabel")}</dt>
            <dd className="mt-1 font-mono text-foreground">{loyaltyProgrammeAccountNumber}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
