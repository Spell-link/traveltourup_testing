import "server-only";

import { loadFaviconPngForPdf } from "@/lib/brand/favicon-pdf-image";

/** Monochrome palette — Duffel-style booking confirmation. */
export const PDF_INK = { r: 17, g: 24, b: 39 };
export const PDF_MUTED = { r: 107, g: 114, b: 128 };
export const PDF_BORDER = { r: 229, g: 231, b: 235 };
export const PDF_PANEL = { r: 249, g: 250, b: 251 };
export const PDF_BRAND = { r: 2, g: 132, b: 199 };
export const PDF_WATERMARK = { r: 243, g: 244, b: 246 };

/** jsPDF font sizes in pt — compact, readable (Duffel-inspired). */
export const PDF_FONT = {
  footer: 8,
  meta: 8,
  label: 8,
  labelSm: 7.5,
  body: 9,
  bodySm: 8.5,
  bodyMd: 10,
  cardTitle: 10,
  section: 12,
  headerLabel: 8,
  headerBrand: 11,
  headerRef: 14,
  total: 11,
  heroTitle: 11,
  carrierFallback: 8,
} as const;

/** Layout spacing in mm — tight side margins, compact section rhythm (Duffel-like). */
export const PDF_LAYOUT = {
  pageMargin: 10,
  pageBottomReserve: 24,
  sectionTitleTop: 2,
  sectionTitleBottom: 1,
  blockGap: 4,
  cardInnerPad: 4,
  cardRadius: 2,
} as const;

export type JsPdfDoc = import("jspdf").jsPDF;

/** Portrait A4 — matches Duffel booking confirmation proportions. */
export const PDF_PAGE = {
  orientation: "portrait" as const,
  unit: "mm" as const,
  format: "a4" as const,
} as const;

export function createBookingPdfDocument(
  jsPDF: typeof import("jspdf").default,
): JsPdfDoc {
  return new jsPDF({ ...PDF_PAGE });
}

export function pdfPageMetrics(doc: JsPdfDoc): {
  pageW: number;
  pageH: number;
  margin: number;
  maxW: number;
} {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_LAYOUT.pageMargin;
  return { pageW, pageH, margin, maxW: pageW - margin * 2 };
}

export function drawPdfBrandWatermark(doc: JsPdfDoc, pageW: number, pageH: number) {
  doc.saveGraphicsState();
  doc.setTextColor(PDF_WATERMARK.r, PDF_WATERMARK.g, PDF_WATERMARK.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("TRAVEL TOUR UP", pageW / 2, pageH / 2 + 4, { align: "center", angle: 35 });
  doc.restoreGraphicsState();
}

export async function drawPdfBrandHeader(
  doc: JsPdfDoc,
  bookingRefNo: string,
  margin: number,
  pageW: number,
): Promise<number> {
  const logoHeight = 12;
  const logoTop = 6;
  let logoWidth = logoHeight;

  const favicon = await loadFaviconPngForPdf();
  if (favicon) {
    logoWidth = logoHeight * favicon.aspectRatio;
    const b64 = favicon.buffer.toString("base64");
    doc.addImage(
      `data:image/png;base64,${b64}`,
      "PNG",
      margin,
      logoTop,
      logoWidth,
      logoHeight,
      undefined,
      "FAST",
    );
  } else {
    doc.setFillColor(PDF_BRAND.r, PDF_BRAND.g, PDF_BRAND.b);
    doc.roundedRect(margin, logoTop, logoHeight, logoHeight, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("TTU", margin + logoHeight / 2, logoTop + logoHeight / 2 + 1, { align: "center" });
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.setFontSize(PDF_FONT.headerBrand);
    doc.text("TravelTourUp", margin + logoHeight + 4, logoTop + logoHeight / 2 + 1.5);
  }

  const refX = pageW - margin;
  doc.setFontSize(PDF_FONT.headerLabel);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text("Booking reference", refX, 11, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.headerRef);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(bookingRefNo, refX, 21, { align: "right" });

  const headerRuleY = 26;
  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.3);
  doc.line(margin, headerRuleY, pageW - margin, headerRuleY);

  return headerRuleY + 3;
}

export function drawPdfSectionTitle(doc: JsPdfDoc, title: string, margin: number, y: number): number {
  y += PDF_LAYOUT.sectionTitleTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.section);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(title, margin, y);
  return y + PDF_LAYOUT.sectionTitleBottom + 1;
}

export function pdfCenteredBlockTop(boxTop: number, boxHeight: number, blockHeight: number): number {
  return boxTop + Math.max(0, (boxHeight - blockHeight) / 2);
}

export function pdfCenteredTextBaselineY(boxTop: number, boxHeight: number, textHeight: number): number {
  return boxTop + (boxHeight + textHeight) / 2;
}

/** Right-align wrapped text within a box (Duffel-style airport lines). */
export function pdfTextRightAligned(
  doc: JsPdfDoc,
  lines: string[],
  rightX: number,
  startY: number,
  lineHeight: number,
): void {
  lines.forEach((line, i) => {
    doc.text(line, rightX, startY + i * lineHeight, { align: "right" });
  });
}

export function fmtPdfWhenLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function pdfMoneyLine(currency: string, amount: string | null | undefined): string | null {
  if (!amount) return null;
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`.trim();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return `${currency} ${amount}`.trim();
  }
}
