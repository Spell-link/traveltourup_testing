/** Parse booking `itinerary_snapshot` into display-friendly journey rows. */

export type OrderItinerarySegment = {
  origin_iata: string;
  destination_iata: string;
  departing_at: string | null;
  arriving_at: string | null;
  marketing_carrier_name: string | null;
  flight_number: string | null;
  cabin_class: string | null;
  origin_terminal: string | null;
  destination_terminal: string | null;
};

export type OrderItinerarySlice = {
  slice_index: number;
  origin_iata: string;
  destination_iata: string;
  segments: OrderItinerarySegment[];
};

function segFromUnknown(raw: unknown): OrderItinerarySegment | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const origin =
    typeof s.origin_iata === "string"
      ? s.origin_iata
      : s.origin && typeof s.origin === "object"
        ? ((s.origin as { iata_code?: string }).iata_code ?? "")
        : "";
  const dest =
    typeof s.destination_iata === "string"
      ? s.destination_iata
      : s.destination && typeof s.destination === "object"
        ? ((s.destination as { iata_code?: string }).iata_code ?? "")
        : "";
  const dep = typeof s.departing_at === "string" ? s.departing_at : null;
  const arr = typeof s.arriving_at === "string" ? s.arriving_at : null;
  const carrier =
    typeof s.marketing_carrier_name === "string"
      ? s.marketing_carrier_name
      : s.marketing_carrier && typeof s.marketing_carrier === "object"
        ? ((s.marketing_carrier as { name?: string }).name ?? null)
        : null;
  const fn = typeof s.flight_number === "string" ? s.flight_number : null;
  const cabin = typeof s.cabin_class === "string" ? s.cabin_class : null;
  const oTerm =
    s.origin && typeof s.origin === "object"
      ? ((s.origin as { terminal?: string }).terminal ?? null)
      : null;
  const dTerm =
    s.destination && typeof s.destination === "object"
      ? ((s.destination as { terminal?: string }).terminal ?? null)
      : null;
  return {
    origin_iata: origin.toUpperCase(),
    destination_iata: dest.toUpperCase(),
    departing_at: dep,
    arriving_at: arr,
    marketing_carrier_name: carrier,
    flight_number: fn,
    cabin_class: cabin,
    origin_terminal: oTerm,
    destination_terminal: dTerm,
  };
}

export function parseOrderItineraryFromSnapshot(snapshot: unknown): OrderItinerarySlice[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const root = snapshot as Record<string, unknown>;
  const slicesRaw = root.slices;
  if (!Array.isArray(slicesRaw)) return [];

  const out: OrderItinerarySlice[] = [];
  for (let i = 0; i < slicesRaw.length; i++) {
    const sl = slicesRaw[i];
    if (!sl || typeof sl !== "object") continue;
    const s = sl as Record<string, unknown>;
    const origin =
      typeof s.origin_iata === "string"
        ? s.origin_iata
        : s.origin && typeof s.origin === "object"
          ? ((s.origin as { iata_code?: string }).iata_code ?? "")
          : "";
    const dest =
      typeof s.destination_iata === "string"
        ? s.destination_iata
        : s.destination && typeof s.destination === "object"
          ? ((s.destination as { iata_code?: string }).iata_code ?? "")
          : "";
    const segsRaw = Array.isArray(s.segments) ? s.segments : [];
    const segments = segsRaw
      .map(segFromUnknown)
      .filter((x): x is OrderItinerarySegment => x !== null);
    if (!origin && !dest && segments.length === 0) continue;
    out.push({
      slice_index: i,
      origin_iata: (origin || segments[0]?.origin_iata || "").toUpperCase(),
      destination_iata: (dest || segments[segments.length - 1]?.destination_iata || "").toUpperCase(),
      segments,
    });
  }
  return out;
}

export function formatSegmentDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function layoverMinutesBetween(arrivingAt: string | null, departingAt: string | null): number | null {
  if (!arrivingAt || !departingAt) return null;
  const a = new Date(arrivingAt).getTime();
  const b = new Date(departingAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  return Math.round((b - a) / 60_000);
}

export function formatLayoverLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m layover`;
  if (h > 0) return `${h}h layover`;
  return `${m}m layover`;
}
