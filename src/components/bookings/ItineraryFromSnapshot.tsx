"use client";

function formatIsoDateTime(iso: string | null | undefined): { date: string; time: string } | null {
  if (!iso || typeof iso !== "string" || iso.length < 16) return null;
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Fallback compact itinerary when snapshot cannot be mapped to flight detail layout. */
export function ItineraryFromSnapshot({ snapshot }: { snapshot: unknown }) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const slices = (snapshot as { slices?: unknown }).slices;
  if (!Array.isArray(slices) || slices.length === 0) return null;
  return (
    <div className="mt-3 space-y-3 text-sm">
      {slices.map((sl, i) => {
        if (!sl || typeof sl !== "object") return null;
        const origin =
          typeof (sl as { origin_iata?: string }).origin_iata === "string"
            ? (sl as { origin_iata: string }).origin_iata
            : "";
        const dest =
          typeof (sl as { destination_iata?: string }).destination_iata === "string"
            ? (sl as { destination_iata: string }).destination_iata
            : "";
        const segs = (sl as { segments?: unknown }).segments;
        if (!Array.isArray(segs) || segs.length === 0) {
          return (
            <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <span className="font-medium text-foreground">
                {origin || "—"} → {dest || "—"}
              </span>
            </div>
          );
        }
        return (
          <div key={i} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <p className="font-medium text-foreground">
              {origin || "—"} → {dest || "—"}
            </p>
            <ul className="mt-2 space-y-1.5 border-t border-border/40 pt-2 text-xs text-muted-foreground">
              {segs.map((seg, j) => {
                if (!seg || typeof seg !== "object") return null;
                const s = seg as {
                  departing_at?: string | null;
                  arriving_at?: string | null;
                  origin_iata?: string;
                  destination_iata?: string;
                  marketing_carrier_name?: string | null;
                  flight_number?: string | null;
                };
                const dep = formatIsoDateTime(s.departing_at ?? undefined);
                const arr = formatIsoDateTime(s.arriving_at ?? undefined);
                const fn =
                  s.marketing_carrier_name && s.flight_number
                    ? `${s.marketing_carrier_name} ${s.flight_number}`
                    : s.flight_number
                      ? `Flight ${s.flight_number}`
                      : null;
                const leg =
                  s.origin_iata && s.destination_iata ? `${s.origin_iata} → ${s.destination_iata}` : null;
                return (
                  <li key={j} className="text-foreground">
                    {fn ? <span className="font-medium">{fn}</span> : null}
                    {leg ? <span className={fn ? " ml-2 text-muted-foreground" : ""}>{leg}</span> : null}
                    {dep ? (
                      <span className="mt-0.5 block text-muted-foreground">
                        Depart {dep.date} {dep.time}
                        {arr ? ` · Arrive ${arr.date} ${arr.time}` : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
