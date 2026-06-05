"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Star } from "lucide-react";

import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import { formatStayDateLong } from "@/lib/stays/stays-booking-display";

type Props = {
  display: StaysBookingDisplay;
};

export function BookingHotelStayDetail({ display }: Props) {
  const locale = useLocale();
  const t = useTranslations("Hotels.bookingDetail");

  const addressParts = [display.addressLine, display.city, display.countryCode].filter(Boolean);
  const address = addressParts.join(", ");

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row">
        {display.photoUrl ? (
          <div className="relative h-48 w-full shrink-0 sm:h-auto sm:w-56">
            <Image
              src={display.photoUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}
        <div className="flex-1 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("stayDetailsHeading")}
          </h2>
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <p className="text-lg font-semibold text-foreground">{display.accommodationName}</p>
            {display.stars != null && display.stars > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-amber-600">
                <Star className="h-4 w-4 fill-current" aria-hidden />
                <span className="text-sm font-medium">{display.stars}</span>
              </span>
            ) : null}
          </div>
          {address ? (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {address}
            </p>
          ) : null}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {display.roomName ? (
              <>
                <dt className="text-muted-foreground">{t("roomLabel")}</dt>
                <dd className="font-medium text-foreground">{display.roomName}</dd>
              </>
            ) : null}
            {display.mealPlanLabel ? (
              <>
                <dt className="text-muted-foreground">{t("mealPlanLabel")}</dt>
                <dd className="text-foreground">{display.mealPlanLabel}</dd>
              </>
            ) : null}
            {display.checkInDate ? (
              <>
                <dt className="text-muted-foreground">{t("checkInLabel")}</dt>
                <dd className="text-foreground">
                  {formatStayDateLong(display.checkInDate, locale)}
                  {display.checkInAfterTime ? (
                    <span className="block text-xs text-muted-foreground">
                      {t("checkInAfter", { time: display.checkInAfterTime })}
                    </span>
                  ) : null}
                </dd>
              </>
            ) : null}
            {display.checkOutDate ? (
              <>
                <dt className="text-muted-foreground">{t("checkOutLabel")}</dt>
                <dd className="text-foreground">
                  {formatStayDateLong(display.checkOutDate, locale)}
                  {display.checkOutBeforeTime ? (
                    <span className="block text-xs text-muted-foreground">
                      {t("checkOutBefore", { time: display.checkOutBeforeTime })}
                    </span>
                  ) : null}
                </dd>
              </>
            ) : null}
            {display.nights != null ? (
              <>
                <dt className="text-muted-foreground">{t("nightsLabel")}</dt>
                <dd className="text-foreground">{t("nightsCount", { count: display.nights })}</dd>
              </>
            ) : null}
            {display.roomsCount != null ? (
              <>
                <dt className="text-muted-foreground">{t("roomsLabel")}</dt>
                <dd className="text-foreground">{t("roomsCount", { count: display.roomsCount })}</dd>
              </>
            ) : null}
            {display.guestsCount != null ? (
              <>
                <dt className="text-muted-foreground">{t("guestsLabel")}</dt>
                <dd className="text-foreground">{t("guestsCount", { count: display.guestsCount })}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}
