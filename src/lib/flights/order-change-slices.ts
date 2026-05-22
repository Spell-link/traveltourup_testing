/**
 * Parse Duffel order `slices` for voluntary order-change UI (pure, testable).
 */

export type OrderChangeSliceOption = {
  slice_id: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  cabin_class: string | null;
  label: string;
  departing_at: string | null;
  arriving_at: string | null;
  carrier_name: string | null;
};

function unwrapOrderData(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

function iataFromPlace(place: unknown): string {
  if (!place || typeof place !== "object") return "";
  const p = place as Record<string, unknown>;
  if (typeof p.iata_code === "string") return p.iata_code.toUpperCase();
  if (typeof p.iata === "string") return p.iata.toUpperCase();
  return "";
}

function dateFromIso(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return "";
  return iso.slice(0, 10);
}

export function parseOrderChangeSlicesFromOrderRaw(raw: unknown): OrderChangeSliceOption[] {
  const data = unwrapOrderData(raw);
  if (!data) return [];
  const slices = data.slices;
  if (!Array.isArray(slices)) return [];

  const out: OrderChangeSliceOption[] = [];
  for (let i = 0; i < slices.length; i++) {
    const sl = slices[i];
    if (!sl || typeof sl !== "object") continue;
    const s = sl as Record<string, unknown>;
    const sliceId = typeof s.id === "string" ? s.id : "";
    if (!sliceId.startsWith("sli_")) continue;

    const origin = iataFromPlace(s.origin);
    const dest = iataFromPlace(s.destination);
    const segs = Array.isArray(s.segments) ? s.segments : [];
    const first = segs[0] && typeof segs[0] === "object" ? (segs[0] as Record<string, unknown>) : null;
    const last =
      segs.length > 0 && segs[segs.length - 1] && typeof segs[segs.length - 1] === "object"
        ? (segs[segs.length - 1] as Record<string, unknown>)
        : first;

    const departingAt =
      first && typeof first.departing_at === "string" ? first.departing_at : null;
    const arrivingAt = last && typeof last.arriving_at === "string" ? last.arriving_at : null;
    const depDate = dateFromIso(departingAt);
    const cabin =
      first && typeof first.cabin_class === "string" ? first.cabin_class : null;
    const carrier =
      first && typeof first.marketing_carrier === "object"
        ? ((first.marketing_carrier as Record<string, unknown>).name as string | undefined)
        : undefined;

    const legLabel =
      origin && dest
        ? `${origin} → ${dest}${depDate ? ` · ${depDate}` : ""}`
        : `Leg ${i + 1}`;

    out.push({
      slice_id: sliceId,
      origin_iata: origin,
      destination_iata: dest,
      departure_date: depDate,
      cabin_class: cabin,
      label: legLabel,
      departing_at: departingAt,
      arriving_at: arrivingAt,
      carrier_name: carrier ?? null,
    });
  }
  return out;
}

export function buildOrderChangeSlicesBody(input: {
  selected_slice_id: string;
  departure_date: string;
  origin?: string;
  destination?: string;
  cabin_class?: string;
  slices: OrderChangeSliceOption[];
}): {
  remove: Array<{ slice_id: string }>;
  add: Array<{
    origin: string;
    destination: string;
    departure_date: string;
    cabin_class?: string;
  }>;
} {
  const selected = input.slices.find((s) => s.slice_id === input.selected_slice_id);
  if (!selected) {
    throw new Error("SELECTED_SLICE_NOT_FOUND");
  }
  const origin = (input.origin ?? selected.origin_iata).trim().toUpperCase();
  const destination = (input.destination ?? selected.destination_iata).trim().toUpperCase();
  const cabin = input.cabin_class ?? selected.cabin_class ?? undefined;
  const add: {
    origin: string;
    destination: string;
    departure_date: string;
    cabin_class?: string;
  } = {
    origin,
    destination,
    departure_date: input.departure_date,
  };
  if (cabin) add.cabin_class = cabin;
  return {
    remove: [{ slice_id: input.selected_slice_id }],
    add: [add],
  };
}

export function orderChangeSliceFingerprint(input: {
  selected_slice_id: string;
  departure_date: string;
  origin: string;
  destination: string;
  cabin_class?: string | null;
}): string {
  return [
    input.selected_slice_id,
    input.departure_date,
    input.origin.toUpperCase(),
    input.destination.toUpperCase(),
    input.cabin_class ?? "",
  ].join("|");
}
