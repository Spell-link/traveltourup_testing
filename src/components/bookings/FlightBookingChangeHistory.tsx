"use client";

import { useCallback, useEffect, useState } from "react";

import { listFlightOrderChanges, type FlightOrderChangeRow } from "@/lib/http/flights.client";

type Props = {
  bookingId: string;
};

export function FlightBookingChangeHistory({ bookingId }: Props) {
  const [history, setHistory] = useState<FlightOrderChangeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await listFlightOrderChanges(bookingId);
      setHistory(
        res.order_changes.filter((row) => row.status !== "expired"),
      );
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading || history.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Change history</h2>
      <ul className="mt-3 space-y-2 text-xs">
        {history.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 px-3 py-2"
          >
            <span className="font-mono text-muted-foreground">
              {row.duffel_order_change_id ?? row.duffel_order_change_request_id ?? row.id}
            </span>
            <span className="text-foreground">
              {row.status}
              {row.change_amount ? ` · ${row.change_amount} ${row.change_currency ?? ""}` : ""}
            </span>
            <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
