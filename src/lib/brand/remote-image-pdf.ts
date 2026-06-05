import "server-only";

export type RemoteImageRaster = {
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
};

const imageCache = new Map<string, RemoteImageRaster>();

/**
 * Fetches a remote image (hotel photo, etc.) and returns PNG bytes for jsPDF.
 */
export async function loadRemoteImagePngForPdf(
  url: string,
  maxSidePx = 320,
): Promise<RemoteImageRaster | null> {
  const key = `${url.trim()}::${maxSidePx}`;
  if (!key || key === `::${maxSidePx}`) return null;

  const cached = imageCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(url.trim(), {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
    });
    if (!res.ok) return null;

    const raw = Buffer.from(await res.arrayBuffer());
    if (raw.length === 0) return null;

    const sharp = (await import("sharp")).default;
    const png = await sharp(raw, { density: 150 })
      .resize(maxSidePx, maxSidePx, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    const meta = await sharp(png).metadata();
    const raster: RemoteImageRaster = {
      buffer: png,
      widthPx: meta.width ?? maxSidePx,
      heightPx: meta.height ?? maxSidePx,
    };
    imageCache.set(key, raster);
    return raster;
  } catch {
    return null;
  }
}

export function fitImageInBoxMm(
  widthPx: number,
  heightPx: number,
  boxW: number,
  boxH: number,
): { w: number; h: number } {
  if (widthPx <= 0 || heightPx <= 0) return { w: boxW, h: boxH };
  const ratio = widthPx / heightPx;
  const boxRatio = boxW / boxH;
  if (ratio >= boxRatio) return { w: boxW, h: boxW / ratio };
  return { w: boxH * ratio, h: boxH };
}
