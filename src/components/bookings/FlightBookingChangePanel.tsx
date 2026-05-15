"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type OrderChangeOffer = {
  id: string;
  change_total_amount: string | null;
  change_total_currency: string | null;
  new_total_amount: string | null;
  new_total_currency: string | null;
  penalty_total_amount: string | null;
  penalty_total_currency: string | null;
  expires_at: string | null;
};

type OrderChangeRow = {
  id: string;
  source: string;
  status: string;
  duffel_order_change_request_id: string | null;
  duffel_order_change_id: string | null;
  change_amount: string | null;
  change_currency: string | null;
  quote_expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

type Props = {
  bookingId: string;
  bookingStatus: string;
  onChangeConfirmed?: () => void;
};

/**
 * Phase-1 voluntary order change panel. The user requests a quote via
 * `POST /order-changes`; we display airline offers and a confirm button.
 * Paid changes are not yet supported (the server returns 501 for positive
 * deltas) — the UI hides the confirm CTA when `change_total_amount > 0`.
 */
export function FlightBookingChangePanel({
  bookingId,
  bookingStatus,
  onChangeConfirmed,
}: Props) {
  const [items, setItems] = useState<OrderChangeRow[] | null>(null);
  const [offers, setOffers] = useState<OrderChangeOffer[] | null>(null);
  const [activeChangeId, setActiveChangeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/flights/bookings/${encodeURIComponent(bookingId)}/order-changes`,
        { method: "GET", cache: "no-store" },
      );
      const body = (await res.json()) as
        | { success: true; data: { order_changes: OrderChangeRow[] } }
        | { success: false; message?: string };
      if (!res.ok || body.success === false) {
        throw new Error(("message" in body && body.message) || `HTTP ${res.status}`);
      }
      setItems(body.data.order_changes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load change history.");
    }
  }, [bookingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestQuote = async () => {
    setError(null);
    setInfo(null);
    setOffers(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/flights/bookings/${encodeURIComponent(bookingId)}/order-changes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slices: {
              add: [
                {
                  origin: origin.trim().toUpperCase(),
                  destination: destination.trim().toUpperCase(),
                  departure_date: departureDate.trim(),
                },
              ],
            },
          }),
        },
      );
      const body = (await res.json()) as
        | {
            success: true;
            data: {
              id: string;
              offers: OrderChangeOffer[];
              quote_expires_at: string | null;
            };
          }
        | { success: false; message?: string };
      if (!res.ok || body.success === false) {
        throw new Error(("message" in body && body.message) || `HTTP ${res.status}`);
      }
      setActiveChangeId(body.data.id);
      setOffers(body.data.offers);
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request change quote.");
    } finally {
      setBusy(false);
    }
  };

  const confirmOffer = async (offerId: string) => {
    if (!activeChangeId) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/flights/bookings/${encodeURIComponent(bookingId)}/order-changes/${encodeURIComponent(activeChangeId)}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_change_offer_id: offerId }),
        },
      );
      const body = (await res.json()) as
        | { success: true; data: unknown }
        | { success: false; message?: string };
      if (!res.ok || body.success === false) {
        throw new Error(("message" in body && body.message) || `HTTP ${res.status}`);
      }
      setOffers(null);
      setActiveChangeId(null);
      setInfo("Change confirmed with the airline.");
      onChangeConfirmed?.();
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm change.");
    } finally {
      setBusy(false);
    }
  };

  if (bookingStatus !== "confirmed") {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-background p-4 sm:p-6">
      <h3 className="text-base font-semibold text-foreground">Change your flight</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Request a quote from the airline for a different date or route. Free changes are
        applied immediately; paid changes are coming soon.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="From (IATA, e.g. JFK)"
          maxLength={8}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm uppercase"
        />
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="To (IATA, e.g. LHR)"
          maxLength={8}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm uppercase"
        />
        <input
          type="date"
          value={departureDate}
          onChange={(e) => setDepartureDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void requestQuote()}
          disabled={busy || !origin || !destination || !departureDate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Get change quote
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      {info ? <p className="mt-3 text-sm text-emerald-700">{info}</p> : null}

      {offers && offers.length > 0 ? (
        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Airline offers</h4>
          {offers.map((o) => {
            const delta = Number.parseFloat(o.change_total_amount ?? "0");
            const free = Number.isFinite(delta) && delta <= 0;
            return (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    New total: {o.new_total_amount ?? "—"} {o.new_total_currency ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Change delta:{" "}
                    {o.change_total_amount ?? "0"} {o.change_total_currency ?? ""}
                    {o.penalty_total_amount
                      ? ` · penalty ${o.penalty_total_amount} ${o.penalty_total_currency ?? ""}`
                      : ""}
                  </p>
                </div>
                {free ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmOffer(o.id)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Confirm change
                  </button>
                ) : (
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    Paid changes coming soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-foreground">Change history</h4>
          <ul className="mt-2 space-y-1.5 text-xs">
            {items.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-1.5"
              >
                <span className="font-mono text-muted-foreground">
                  {row.duffel_order_change_id ?? row.duffel_order_change_request_id}
                </span>
                <span>
                  {row.source} · {row.status}
                </span>
                <span className="text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
