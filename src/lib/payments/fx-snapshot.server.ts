import "server-only";

const OPEN_ER = "https://open.er-api.com/v6/latest/USD";

export type ServerFxSnapshot = {
  base: string;
  rates: Record<string, number>;
  as_of: string | null;
};

/** Server-authoritative FX snapshot (same upstream as /api/v1/exchange-rates). */
export async function fetchServerFxSnapshot(): Promise<ServerFxSnapshot> {
  const res = await fetch(OPEN_ER, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error("FX upstream failed");
  }
  const data = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
    time_last_update_utc?: string;
  };
  if (data.result !== "success" || !data.rates) {
    throw new Error("Invalid FX payload");
  }
  const rates: Record<string, number> = { USD: 1 };
  for (const code of ["EUR", "PKR", "SAR"] as const) {
    const v = data.rates[code];
    if (typeof v === "number" && Number.isFinite(v)) {
      rates[code] = v;
    }
  }
  return {
    base: "USD",
    rates,
    as_of: data.time_last_update_utc ?? null,
  };
}

export function resolveChargeCurrency(input: {
  customerCurrencyRequested: string;
  supplierCurrency: string;
  stripeSupports: (code: string) => boolean;
}): { chargeCurrency: string; fallback: boolean } {
  const requested = input.customerCurrencyRequested.toUpperCase();
  if (input.stripeSupports(requested)) {
    return { chargeCurrency: requested, fallback: false };
  }
  const supplier = input.supplierCurrency.toUpperCase();
  if (input.stripeSupports(supplier)) {
    return { chargeCurrency: supplier, fallback: true };
  }
  return { chargeCurrency: "USD", fallback: true };
}
