import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

/** Rasterized favicon for jsPDF (SVG is not supported natively). */
let cachedLogo:
  | { buffer: Buffer; aspectRatio: number }
  | null = null;

const FAVICON_REL = path.join("public", "favicon.svg");

/**
 * Loads `public/favicon.svg` as a PNG buffer for PDF embedding.
 * Result is cached for the process lifetime.
 */
export async function loadFaviconPngForPdf(): Promise<{
  buffer: Buffer;
  aspectRatio: number;
} | null> {
  if (cachedLogo) return cachedLogo;

  try {
    const sharp = (await import("sharp")).default;
    const svgPath = path.join(process.cwd(), FAVICON_REL);
    const svg = await readFile(svgPath);
    const meta = await sharp(svg).metadata();
    const width = meta.width ?? 420;
    const height = meta.height ?? 237;
    const buffer = await sharp(svg)
      .resize(840, Math.round((840 * height) / width))
      .png()
      .toBuffer();
    cachedLogo = { buffer, aspectRatio: width / height };
    return cachedLogo;
  } catch {
    return null;
  }
}
