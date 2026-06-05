"use client";

import { Building2, Calendar, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StaysQuoteSession } from "@/lib/stays/stays-quote-session";

type Props = {
  session: StaysQuoteSession | null;
  fallbackTitle?: string;
};

export function HotelCheckoutRecap({ session, fallbackTitle }: Props) {
  const t = useTranslations("Hotels.checkout");
  const title = session?.hotel_name ?? fallbackTitle ?? t("defaultSummaryTitle");
  const address = session?.hotel_address;
  const roomLine = [
    session?.rooms && session.rooms > 1 ? `${session.rooms}×` : "1×",
    session?.room_name ?? t("defaultSummaryTitle"),
    session?.board_type ? ` · ${session.board_type}` : "",
  ].join("");

  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 md:p-5">
      <div className="flex gap-3">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {address ? (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{address}</span>
            </p>
          ) : null}
          {session?.room_name ? (
            <p className="mt-2 text-sm font-medium text-foreground">{roomLine}</p>
          ) : null}
          {session?.check_in && session?.check_out ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {t("recapCheckIn")} {session.check_in} · {t("recapCheckOut")} {session.check_out}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
