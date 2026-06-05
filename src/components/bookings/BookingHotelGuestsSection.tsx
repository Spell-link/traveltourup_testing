"use client";

import { useTranslations } from "next-intl";

import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";

type Props = {
  display: StaysBookingDisplay;
};

export function BookingHotelGuestsSection({ display }: Props) {
  const t = useTranslations("Hotels.bookingDetail");
  const { guests } = display;

  if (guests.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("guestsOnlyHeading")}
      </h2>
      <ul className="mt-4 space-y-3 text-sm">
        {guests.map((g, i) => (
          <li key={`${g.fullName}-${i}`} className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
            <p className="font-medium text-foreground">
              {t("guestNumber", { number: i + 1 })} — {g.fullName}
            </p>
            {g.bornOn ? (
              <p className="text-xs text-muted-foreground">{t("dobLabel", { date: g.bornOn })}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
