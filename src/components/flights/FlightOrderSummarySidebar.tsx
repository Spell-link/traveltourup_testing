"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";

import { useCurrency } from "@/components/providers/CurrencyProvider";
import { formatDuffelDateTime } from "@/lib/flights/duffel-order-display";
import { parseOrderItineraryFromSnapshot } from "@/lib/flights/order-itinerary-display";

type Props = {
  bookingRefNo: string;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  currency: string;
  airlinePnr?: string | null;
  duffelOrderId?: string | null;
  itinerarySnapshot?: unknown;
  paymentStatusLabel?: string;
  airlineName?: string | null;
  airlineLogoUrl?: string | null;
  orderCreatedAt?: string | null;
};

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "confirmed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (s === "cancelled") return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
  return "bg-muted text-muted-foreground";
}

export function FlightOrderSummarySidebar({
  bookingRefNo,
  status,
  paymentStatus,
  totalAmount,
  currency,
  airlinePnr,
  duffelOrderId,
  itinerarySnapshot,
  paymentStatusLabel,
  airlineName,
  airlineLogoUrl,
  orderCreatedAt,
}: Props) {
  const locale = useLocale();
  const { formatPrice } = useCurrency();
  const slices = parseOrderItineraryFromSnapshot(itinerarySnapshot);
  const firstSeg = slices[0]?.segments[0];
  const carrier = airlineName ?? firstSeg?.marketing_carrier_name;

  const totalN = Number.parseFloat(String(totalAmount));
  const totalDisplay = Number.isFinite(totalN)
    ? formatPrice(totalN, currency, locale)
    : `${currency} ${totalAmount}`;

  return (
    <div className="rounded-xl border border-border bg-card " >
      <div className="bg-muted px-6 py-4 border-b border-border flex items-center gap-4" style={{borderRadius: '12px 12px 0px 0px'}}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
      </div>
      <dl className="space-y-2 text-sm p-4">
        {duffelOrderId ? (
          <div>
            <dt className="text-muted-foreground">Order id</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-foreground">{duffelOrderId}</dd>
          </div>
        ) : null}
        {airlinePnr ? (
          <div>
            <dt className="text-muted-foreground">Airline booking reference</dt>
            <dd className="mt-0.5 font-semibold text-foreground">{airlinePnr}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">TravelTourUp reference</dt>
          <dd className="mt-0.5 font-medium text-foreground">{bookingRefNo}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(status)}`}
            >
              {status}
            </span>
          </dd>
        </div>
        {paymentStatusLabel ? (
          <div>
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="mt-0.5 text-foreground">{paymentStatusLabel}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="mt-0.5 capitalize text-foreground">{paymentStatus.replace(/_/g, " ")}</dd>
          </div>
        )}
        {carrier ? (
          <div className="flex items-center gap-2">
            {airlineLogoUrl ? (
              <Image
                src={airlineLogoUrl}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 object-contain"
                unoptimized
              />
            ) : null}
            <div>
              <dt className="text-muted-foreground">Airline</dt>
              <dd className="mt-0.5 font-medium text-foreground">{carrier}</dd>
            </div>
          </div>
        ) : null}
        <div className="border-t border-border/40 pt-3">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="mt-0.5 text-xl font-bold text-primary">{totalDisplay}</dd>
        </div>
        {orderCreatedAt ? (
          <div className="border-t border-border/40 pt-3">
            <dt className="text-muted-foreground">Timeline</dt>
            <dd className="mt-2 text-xs text-muted-foreground">
              Order created {formatDuffelDateTime(orderCreatedAt, locale)}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="text-xs px-4 pb-4">
        <Link href="/profile/flight-activity" className="font-medium text-primary hover:underline">
          View payment activity
        </Link>
      </p>
    </div>
  );
}
