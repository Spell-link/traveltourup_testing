/** Duffel order change offer `slices` payload (add/remove leg data). */
export type OrderChangeOfferSlices = {
  add?: unknown[];
  remove?: unknown[];
};

export function parseOrderChangeOfferSlices(raw: unknown): OrderChangeOfferSlices | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const add = Array.isArray(o.add) ? o.add : undefined;
  const remove = Array.isArray(o.remove) ? o.remove : undefined;
  if (!add?.length && !remove?.length) return null;
  return { add, remove };
}

export function firstAddedSlice(raw: unknown): unknown | null {
  const slices = parseOrderChangeOfferSlices(raw);
  const add = slices?.add;
  if (!add?.length) return null;
  return add[0] ?? null;
}
