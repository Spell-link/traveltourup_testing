"use client";

import { useTranslations } from "next-intl";

import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";

type Props = {
  display: StaysBookingDisplay;
};

export function BookingHotelContactSection({ display }: Props) {
  const t = useTranslations("Hotels.bookingDetail");
  const { contactEmail, contactPhone } = display;

  if (!contactEmail && !contactPhone) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("contactHeading")}
      </h2>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {contactEmail ? (
          <>
            <dt className="text-muted-foreground">{t("contactEmailLabel")}</dt>
            <dd className="text-foreground">{contactEmail}</dd>
          </>
        ) : null}
        {contactPhone ? (
          <>
            <dt className="text-muted-foreground">{t("contactPhoneLabel")}</dt>
            <dd className="text-foreground">{contactPhone}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
