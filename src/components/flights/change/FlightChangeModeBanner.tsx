"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  bookingRefNo: string;
  bookingId: string;
};

export function FlightChangeModeBanner({ bookingRefNo, bookingId }: Props) {
  const t = useTranslations("Flights.change");

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="font-medium text-foreground">
          {t("bannerTitle", { ref: bookingRefNo })}
        </span>
      </div>
      <Link
        href={`/profile/bookings/${encodeURIComponent(bookingId)}`}
        className="text-sm font-medium text-primary hover:underline"
      >
        {t("backToBooking")}
      </Link>
    </div>
  );
}
