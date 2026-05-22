"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import type { FlightListDisplay } from "@/lib/flights/list-display";

type Props = {
  flight: FlightListDisplay;
  bookingRefNo: string;
  totalAmount: number;
  currency: string;
};

export function OriginalBookingCard({ flight, bookingRefNo, totalAmount, currency }: Props) {
  const t = useTranslations("Flights.change");
  const locale = useLocale();
  const { formatPrice } = useCurrency();

  return (
    <div className="mb-6 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("currentBooking")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{bookingRefNo}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">
            {flight.departureAirport} → {flight.arrivalAirport}
          </p>
          <p className="text-sm text-muted-foreground">
            {flight.departureDate} · {flight.departureTime} – {flight.arrivalTime} · {flight.duration}
          </p>
          <p className="text-sm text-muted-foreground">{flight.airline}</p>
        </div>
        <p className="text-lg font-bold text-foreground">
          {formatPrice(totalAmount, currency, locale)}
        </p>
      </div>
    </div>
  );
}
