"use client";

import React, { useMemo } from "react";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { SeatMapDTO } from "@/lib/duffel/dto/seat-map.dto";
import { groupDuplicatedOfferServices } from "@/lib/flights/group-offer-services";
import { Button } from "@/components/ui/Button";
import { FlightWindowSeatPicker } from "@/components/flights/FlightWindowSeatPicker";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

export function FlightCheckoutDuffelExtras(props: {
  offer: FlightOfferDTO;
  seatMaps: SeatMapDTO[] | null;
  seatMapsLoading: boolean;
  seatMapsError: string | null;
  bagQuantities: Record<string, number>;
  onBagQuantityChange: (serviceId: string, qty: number) => void;
  seatPassengerId: string;
  onSeatPassengerChange: (passengerId: string) => void;
  /** `${segmentId}::${passengerId}` → seat service id */
  seatSelections: Record<string, string>;
  onSelectSeat: (segmentId: string, passengerId: string, serviceId: string | null) => void;
  onBack: () => void;
  onContinueToPayment: () => void;
  payBusy: boolean;
  pricingError: string | null;
  /** When false, hides checkout navigation (e.g. embedded in flight detail sidebar). */
  showActions?: boolean;
  /** Tighter layout and scroll for narrow sidebars. */
  compact?: boolean;
}) {
  const {
    offer,
    seatMaps,
    seatMapsLoading,
    seatMapsError,
    bagQuantities,
    onBagQuantityChange,
    seatPassengerId,
    onSeatPassengerChange,
    seatSelections,
    onSelectSeat,
    onBack,
    onContinueToPayment,
    payBusy,
    pricingError,
    showActions = true,
    compact = false,
  } = props;
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const t = useTranslations("Booking.sidebar");
  const pad = compact ? "p-3" : "p-6";
  const formatSeatPrice = (amount: number, currency: string) => formatPrice(amount, currency, locale);

  const serviceGroups = useMemo(
    () => groupDuplicatedOfferServices(offer.available_services),
    [offer.available_services],
  );

  const hasBags = offer.available_services.length > 0;

  return (
    <div className={compact ? "space-y-4" : "space-y-8"}>
      {hasBags ? (
        <section className={`rounded-2xl border border-border bg-card shadow-sm ${pad}`}>
          <h2 className={`font-semibold text-foreground ${compact ? "text-base mb-1" : "text-lg mb-2"}`}>
            {t("bagsSectionTitle")}
          </h2>
          <p className={`text-muted-foreground mb-4 ${compact ? "text-xs" : "text-sm"}`}>
            {t("bagsSectionDescription")}
          </p>
          <ul className="space-y-3">
            {serviceGroups.map(({ display: s, memberIds }) => {
              const max = s.maximum_quantity ?? 9;
              const q0 = bagQuantities[memberIds[0]] ?? 0;
              const q = q0;
              return (
                <li
                  key={memberIds.join("|")}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.type ?? "Extra"}
                      {memberIds.length > 1 ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({memberIds.length} segments — same price)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(Number.parseFloat(s.total_amount), s.total_currency, locale)}
                      {s.maximum_quantity != null ? ` · max ${s.maximum_quantity} per segment` : null}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Qty</span>
                    <input
                      type="number"
                      min={0}
                      max={max}
                      className="w-20 rounded-md border border-input bg-background px-2 py-1"
                      value={q}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        const v = Number.isNaN(n) ? 0 : Math.max(0, Math.min(max, n));
                        for (const id of memberIds) {
                          onBagQuantityChange(id, v);
                        }
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className={`rounded-2xl border border-border bg-card shadow-sm ${pad}`}>
        <FlightWindowSeatPicker
          offer={offer}
          seatMaps={seatMaps}
          seatMapsLoading={seatMapsLoading}
          seatMapsError={seatMapsError}
          seatPassengerId={seatPassengerId}
          onSeatPassengerChange={onSeatPassengerChange}
          seatSelections={seatSelections}
          onSelectSeat={onSelectSeat}
          formatPrice={formatSeatPrice}
          compact={compact}
        />
      </section>

      {showActions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back to passengers
          </Button>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {pricingError ? <p className="text-sm text-destructive">{pricingError}</p> : null}
            <Button type="button" disabled={payBusy} onClick={() => void onContinueToPayment()}>
              {payBusy ? "Preparing…" : "Continue to card payment"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
