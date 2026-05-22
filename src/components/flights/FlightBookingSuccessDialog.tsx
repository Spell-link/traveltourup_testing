"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  Plane,
  Ticket,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/admin_ui/ui/dialog";
import { Button } from "@/components/ui/Button";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { cn } from "@/lib/utils";

export type FlightBookingSuccessPayload = {
  id?: string;
  booking_ref_no?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  total_amount?: string | number;
  guest_data?: {
    customer_charge?: { amount?: string; currency?: string };
    passengers?: Array<{ given_name?: string; family_name?: string }>;
  };
  flight_booking?: {
    booking_reference?: string | null;
    itinerary_snapshot?: FlightOfferDTO | null;
  } | null;
};

type SessionBookingDetails = {
  title?: string;
  subtitle?: string;
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function formatRouteFromOffer(offer: FlightOfferDTO | null | undefined): string | null {
  if (!offer?.slices?.length) return null;
  const parts = offer.slices.map((s) => {
    const from = s.origin_iata ?? s.segments[0]?.origin_iata;
    const to = s.destination_iata ?? s.segments[s.segments.length - 1]?.destination_iata;
    if (!from || !to) return null;
    return `${from} → ${to}`;
  });
  const valid = parts.filter(Boolean);
  return valid.length > 0 ? valid.join(" · ") : null;
}

function formatDepartSummary(offer: FlightOfferDTO | null | undefined): string | null {
  const firstSeg = offer?.slices?.[0]?.segments?.[0];
  if (!firstSeg?.departing_at) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(firstSeg.departing_at));
  } catch {
    return firstSeg.departing_at;
  }
}

function DetailRow({
  label,
  value,
  mono,
  copyValue,
  fieldKey,
  copiedField,
  onCopy,
  copiedLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (fieldKey: string, text: string) => void;
  copiedLabel: string;
}) {
  const isCopied = copiedField === fieldKey;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 text-sm font-semibold text-foreground", mono && "font-mono tracking-tight")}>
          {value}
        </p>
      </div>
      {copyValue ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onCopy(fieldKey, copyValue);
          }}
          className={cn(
            "shrink-0 rounded-lg border p-2 transition-colors duration-200",
            isCopied
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border/60 text-muted-foreground hover:bg-background hover:text-foreground",
          )}
          aria-label={isCopied ? copiedLabel : `Copy ${label}`}
        >
          {isCopied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </button>
      ) : null}
    </motion.div>
  );
}

export function FlightBookingSuccessDialog({
  open,
  onClose,
  booking,
  offer,
  bookingDetails,
  chargeDisplay,
  isHold,
  isRtl,
  confirmationEmail,
  flightsResultsHref = "/flights",
}: {
  open: boolean;
  onClose: () => void;
  booking: FlightBookingSuccessPayload;
  offer: FlightOfferDTO | null;
  bookingDetails: SessionBookingDetails | null;
  chargeDisplay: string | null;
  isHold: boolean;
  isRtl: boolean;
  /** Lead passenger email when present (used for “sent to…” copy). */
  confirmationEmail?: string | null;
  /** Last flight search results URL (My bookings success dismiss). */
  flightsResultsHref?: string;
}) {
  const t = useTranslations("Flights.checkout");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setCopiedField(null);
  }, [open]);

  const snapshot = booking.flight_booking?.itinerary_snapshot ?? offer;
  const route =
    formatRouteFromOffer(snapshot) ??
    bookingDetails?.subtitle ??
    bookingDetails?.title ??
    null;
  const departWhen = formatDepartSummary(snapshot);
  const bookingRef = booking.booking_ref_no ?? booking.id ?? "—";
  const airlinePnr = booking.flight_booking?.booking_reference?.trim() || null;
  const bookingHref =
    typeof booking.id === "string" && booking.id
      ? `/profile/bookings/${encodeURIComponent(booking.id)}`
      : "/profile/bookings";

  const passengerNames = useMemo(() => {
    const pax = booking.guest_data?.passengers ?? [];
    const names = pax
      .map((p) => [p.given_name, p.family_name].filter(Boolean).join(" ").trim())
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : null;
  }, [booking.guest_data?.passengers]);

  const handleCopy = useCallback(async (fieldKey: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(fieldKey);
      window.setTimeout(() => {
        setCopiedField((current) => (current === fieldKey ? null : current));
      }, 2000);
    }
  }, []);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        dir={isRtl ? "rtl" : "ltr"}
        className={cn(
          "max-h-[min(92vh,720px)] gap-0 overflow-hidden border-border/80 bg-background p-0 shadow-xl sm:max-w-lg md:max-w-xl",
          "[&>button.absolute.rounded-sm]:hidden",
        )}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DialogClose
          className={cn(
            "absolute end-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full",
            "border border-border bg-background text-foreground shadow-md",
            "hover:bg-muted",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          )}
          aria-label={t("successDialogClose")}
        >
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </DialogClose>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-h-[min(92vh,720px)] overflow-y-auto dropdown-scrollbar"
        >
          <motion.div className="relative overflow-hidden px-6 pb-6 pt-10">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent"
              aria-hidden
            />

            <div className="relative flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 22, delay: 0.05 }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20"
              >
                <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </motion.div>

              <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {isHold ? t("successHoldPlaced") : t("successBookingConfirmed")}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {isHold ? t("successDialogHoldDescription") : t("successDialogPaidDescription")}
              </DialogDescription>
            </div>

            <div className="relative mt-6 space-y-2.5">
              {route ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <Plane className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 text-start">
                    <p className="text-xs font-medium text-muted-foreground">{t("successDialogRouteLabel")}</p>
                    <p className="font-semibold text-foreground">{route}</p>
                    {departWhen ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {departWhen}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <DetailRow
                label={t("successDialogBookingRefLabel")}
                value={bookingRef}
                mono
                fieldKey="booking_ref"
                copyValue={bookingRef !== "—" ? bookingRef : undefined}
                copiedField={copiedField}
                onCopy={handleCopy}
                copiedLabel={t("successDialogCopied")}
              />

              {airlinePnr ? (
                <DetailRow
                  label={t("successAirlinePnr")}
                  value={airlinePnr}
                  mono
                  fieldKey="airline_pnr"
                  copyValue={airlinePnr}
                  copiedField={copiedField}
                  onCopy={handleCopy}
                  copiedLabel={t("successDialogCopied")}
                />
              ) : null}

              {chargeDisplay ? (
                <DetailRow
                  label={t("successDialogTotalPaidLabel")}
                  value={chargeDisplay}
                  fieldKey="total"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                  copiedLabel={t("successDialogCopied")}
                />
              ) : null}

              {passengerNames ? (
                <DetailRow
                  label={t("successDialogPassengersLabel")}
                  value={passengerNames}
                  fieldKey="passengers"
                  copiedField={copiedField}
                  onCopy={handleCopy}
                  copiedLabel={t("successDialogCopied")}
                />
              ) : null}

              <motion.div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-xs text-muted-foreground">
                <Ticket className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-start leading-relaxed">
                  {confirmationEmail
                    ? t("successDialogEmailSentTo", { email: confirmationEmail })
                    : t("successDialogEmailSentGeneric")}
                </p>
              </motion.div>
            </div>

            <div className="relative mt-6 flex flex-col gap-2.5">
              <Button href={bookingHref} variant="primary-cta" size="lg" className="w-full justify-center gap-2">
                {t("viewYourBooking")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button href={flightsResultsHref} variant="outline" size="md" className="w-full justify-center">
                {t("successDialogBackToFlights")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
