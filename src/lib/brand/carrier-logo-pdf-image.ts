import "server-only";

import { airlineLogoUrl } from "@/data/major-airlines";

export type CarrierLogoRaster = {
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
};

const logoCache = new Map<string, CarrierLogoRaster>();

/** Duffel segment logo from API, or CDN URL by marketing IATA. */
export function resolveCarrierLogoUrl(
  logoUrl: string | null | undefined,
  marketingCarrierIata: string | null | undefined,
): string | null {
  const fromApi = logoUrl?.trim();
  if (fromApi) return fromApi;
  const code = marketingCarrierIata?.trim().toUpperCase();
  if (!code || code.length < 2) return null;
  return airlineLogoUrl(code);
}

/**
 * Fetches a carrier logo (often SVG from Duffel) and returns PNG bytes for jsPDF.
 * Result is cached per URL for the process lifetime.
 */
export async function loadCarrierLogoPngForPdf(url: string): Promise<CarrierLogoRaster | null> {
  const key = url.trim();
  if (!key) return null;

  const cached = logoCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(key, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;

    const raw = Buffer.from(await res.arrayBuffer());
    if (raw.length === 0) return null;

    const sharp = (await import("sharp")).default;
    const png = await sharp(raw, { density: 150 })
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const meta = await sharp(png).metadata();
    const raster: CarrierLogoRaster = {
      buffer: png,
      widthPx: meta.width ?? 128,
      heightPx: meta.height ?? 128,
    };

    logoCache.set(key, raster);
    return raster;
  } catch {
    return null;
  }
}
