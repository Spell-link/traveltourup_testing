import "server-only";

import type { FlightOfferDTO, FlightSegmentDTO, FlightSliceDTO } from "@/lib/duffel/dto/flight-offer.dto";
import {
  loadCarrierLogoPngForPdf,
  resolveCarrierLogoUrl,
} from "@/lib/brand/carrier-logo-pdf-image";
import { loadFaviconPngForPdf } from "@/lib/brand/favicon-pdf-image";
import { FLIGHT_ITINERARY_PDF_LAYOUT_VERSION } from "@/lib/flights/itinerary-pdf.constants";

export type ItineraryPdfPassenger = {
  given_name?: string | null;
  family_name?: string | null;
  born_on?: string | null;
  gender?: string | null;
  title?: string | null;
  type?: string | null;
};

export type BuildItineraryPdfInput = {
  bookingRefNo: string;
  airlineRecordLocator: string | null;
  duffelOrderId: string | null;
  offer: FlightOfferDTO | null;
  passengers: ItineraryPdfPassenger[];
  totalAmount: string;
  currency: string;
  bookingStatus: string;
  paymentStatus: string;
  isHoldBooking: boolean;
};

/** Monochrome invoice palette (Duffel-style). */
const INK = { r: 17, g: 24, b: 39 };
const MUTED = { r: 107, g: 114, b: 128 };
const BORDER = { r: 229, g: 231, b: 235 };
const PANEL = { r: 249, g: 250, b: 251 };
const BRAND = { r: 2, g: 132, b: 199 };
const WATERMARK = { r: 243, g: 244, b: 246 };

/** jsPDF setFontSize values (mm) — tuned for readable A4 download/print. */
const FONT = {
  footer: 14,
  meta: 12,
  label: 16,
  labelSm: 11,
  body: 14,
  bodySm: 14,
  bodyMd: 16,
  cardTitle: 16,
  section: 20,
  headerLabel: 16,
  headerBrand: 20,
  headerRef: 26,
  total: 18,
  carrierFallback: 16,
} as const;

/** Layout spacing (mm) — scales with FONT; keeps existing visual style. */
const LAYOUT = {
  pageMargin: 8,
  pageBottomReserve: 38,
  sectionTitleTop: 3,
  sectionTitleBottom: 0,
  blockGap: 6,
  cardInnerPad: 4,
  cardRadius: 2,
} as const;

type JsPdfDoc = import("jspdf").jsPDF;

function fmtWhenLong(iso: string | null | undefined): string {
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

function fmtTime12(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtBornOn(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(y, m - 1, d));
  } catch {
    return iso;
  }
}

function formatGender(g: string | null | undefined): string {
  if (!g) return "—";
  const v = g.toLowerCase();
  if (v === "m" || v === "male") return "Male";
  if (v === "f" || v === "female") return "Female";
  return g;
}

function passengerLine(p: ItineraryPdfPassenger): string {
  const parts = [p.given_name, p.family_name].map((x) => x?.trim()).filter(Boolean);
  return parts.length ? parts.join(" ") : "Passenger";
}

function passengerTypeLabel(p: ItineraryPdfPassenger, index: number): string {
  const t = p.type?.trim().toLowerCase();
  if (t === "child") return `CHILD ${index + 1}`;
  if (t === "infant") return `INFANT ${index + 1}`;
  return `ADULT ${index + 1}`;
}

function moneyLine(currency: string, amount: string): string {
  const n = Number.parseFloat(amount);
  if (Number.isFinite(n)) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
    } catch {
      return `${currency} ${amount}`;
    }
  }
  return `${currency} ${amount}`;
}

function formatIsoDuration(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const h = m[1] ? Number.parseInt(m[1], 10) : 0;
  const min = m[2] ? Number.parseInt(m[2], 10) : 0;
  if (!h && !min) return null;
  return `${String(h).padStart(2, "0")}h ${String(min).padStart(2, "0")}m`;
}

function sliceWallClockDuration(segments: FlightSegmentDTO[]): string | null {
  const first = segments[0]?.departing_at;
  const last = segments[segments.length - 1]?.arriving_at;
  if (!first || !last) return null;
  const a = new Date(first).getTime();
  const b = new Date(last).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  const totalMin = Math.round((b - a) / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

function sliceDurationLabel(segments: FlightSegmentDTO[]): string {
  return (
    segments.map((s) => formatIsoDuration(s.duration)).find(Boolean) ??
    sliceWallClockDuration(segments) ??
    "—"
  );
}

function stopsLabel(segments: FlightSegmentDTO[]): string {
  const stops = Math.max(0, segments.length - 1);
  return stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`;
}

function airportLine(
  name: string | null | undefined,
  iata: string | null | undefined,
  terminal: string | null | undefined,
  prefix: "Depart from" | "Arrive at",
): string {
  const code = iata?.trim() || "";
  const label = name?.trim() || (code ? `Airport (${code})` : "Airport");
  const term = terminal?.trim() ? `, Terminal ${terminal.trim()}` : "";
  const codePart = code ? ` (${code})` : "";
  return `${prefix} ${label}${codePart}${term}`;
}

function cabinLabel(raw: string | null | undefined): string {
  if (!raw) return "Economy";
  const t = raw.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function flightNumberDisplay(seg: FlightSegmentDTO): string {
  const iata = seg.marketing_carrier_iata ?? "";
  const fn = seg.flight_number ?? "";
  if (iata && fn) return `${iata}${fn}`.replace(/\s+/g, "");
  return fn || "—";
}

/** Rounded square carrier mark on flight slice cards (mm). */
const CARRIER_ICON_SIZE_MM = 12;
const CARRIER_ICON_PADDING_MM = 1.25;
const CARRIER_ICON_RADIUS_MM = 1.5;

/** Fit logo inside inner square while preserving aspect ratio (mm). */
function fitLogoInSquareMm(widthPx: number, heightPx: number, maxSideMm: number): { w: number; h: number } {
  if (widthPx <= 0 || heightPx <= 0) return { w: maxSideMm, h: maxSideMm };
  const ratio = widthPx / heightPx;
  if (ratio >= 1) return { w: maxSideMm, h: maxSideMm / ratio };
  return { w: maxSideMm * ratio, h: maxSideMm };
}

async function drawCarrierMark(doc: JsPdfDoc, seg: FlightSegmentDTO, x: number, y: number) {
  const boxSize = CARRIER_ICON_SIZE_MM;
  const pad = CARRIER_ICON_PADDING_MM;
  const inner = boxSize - pad * 2;

  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setFillColor(PANEL.r, PANEL.g, PANEL.b);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, boxSize, boxSize, CARRIER_ICON_RADIUS_MM, CARRIER_ICON_RADIUS_MM, "FD");

  const url = resolveCarrierLogoUrl(seg.marketing_carrier_logo_url, seg.marketing_carrier_iata);
  if (url) {
    const logo = await loadCarrierLogoPngForPdf(url);
    if (logo) {
      const { w, h } = fitLogoInSquareMm(logo.widthPx, logo.heightPx, inner);
      const drawX = x + pad + (inner - w) / 2;
      const drawY = y + pad + (inner - h) / 2;
      const b64 = logo.buffer.toString("base64");
      doc.addImage(`data:image/png;base64,${b64}`, "PNG", drawX, drawY, w, h);
      return;
    }
  }

  const code = (seg.marketing_carrier_iata ?? "—").slice(0, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.carrierFallback);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(code, x + boxSize / 2, y + boxSize / 2, { align: "center", baseline: "middle" });
}

function drawBrandWatermark(doc: JsPdfDoc, pageW: number, pageH: number) {
  doc.saveGraphicsState();
  doc.setTextColor(WATERMARK.r, WATERMARK.g, WATERMARK.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);
  doc.text("TRAVEL TOUR UP", pageW / 2, pageH / 2 + 6, { align: "center", angle: 35 });
  doc.restoreGraphicsState();
}

async function drawBrandHeader(
  doc: JsPdfDoc,
  input: BuildItineraryPdfInput,
  margin: number,
  pageW: number,
): Promise<number> {
  const logoHeight = 18;
  const logoTop = 10;
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
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    doc.roundedRect(margin, logoTop, logoHeight, logoHeight, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TTU", margin + logoHeight / 2, logoTop + logoHeight / 2 + 1.2, { align: "center" });
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.setFontSize(FONT.headerBrand);
    doc.text("TravelTourUp", margin + logoHeight + 5, logoTop + logoHeight / 2 + 2);
  }

  const refX = pageW - margin;
  doc.setFontSize(FONT.headerLabel);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Booking reference", refX, 14, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.headerRef);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(input.bookingRefNo, refX, 26, { align: "right" });

  const headerRuleY = 34;
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.35);
  doc.line(margin, headerRuleY, pageW - margin, headerRuleY);

  return headerRuleY + 6;
}

function drawSectionTitle(doc: JsPdfDoc, title: string, margin: number, y: number): number {
  y += LAYOUT.sectionTitleTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.section);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(title, margin, y);
  return y + LAYOUT.sectionTitleBottom + 3;
}

/** Top Y for a block of given height vertically centered inside a box (mm). */
function centeredBlockTop(boxTop: number, boxHeight: number, blockHeight: number): number {
  return boxTop + Math.max(0, (boxHeight - blockHeight) / 2);
}

/** jsPDF `text()` uses baseline Y; this centers a line inside a box of known height. */
function centeredTextBaselineY(boxTop: number, boxHeight: number, textHeight: number): number {
  return boxTop + (boxHeight + textHeight) / 2;
}

async function drawFlightSliceCard(
  doc: JsPdfDoc,
  slice: FlightSliceDTO,
  margin: number,
  maxW: number,
  y: number,
): Promise<number> {
  const segments = slice.segments ?? [];
  if (segments.length === 0) return y;

  const first = segments[0];
  const last = segments[segments.length - 1];
  const carrier = first.marketing_carrier_name ?? first.marketing_carrier_iata ?? "Airline";
  const timeRange = `${fmtTime12(first.departing_at)} – ${fmtTime12(last.arriving_at)}`;
  const route = `${slice.origin_iata || first.origin_iata} – ${slice.destination_iata || last.destination_iata}`;
  const duration = sliceDurationLabel(segments);
  const cardTop = y;
  const pad = LAYOUT.cardInnerPad;
  const summaryH = 24;
  const segBlockH = 32;
  const metaBarH = 10;
  const cardH = summaryH + segments.length * segBlockH + metaBarH + pad;
  const iconY = cardTop + (summaryH - CARRIER_ICON_SIZE_MM) / 2;
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cardTop, maxW, cardH, LAYOUT.cardRadius, LAYOUT.cardRadius, "S");

  await drawCarrierMark(doc, first, margin + pad, iconY);

  const textX = margin + pad + CARRIER_ICON_SIZE_MM + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.cardTitle);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(timeRange, textX, cardTop + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.bodySm);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(carrier, textX, cardTop + 16);

  const midX = margin + maxW * 0.48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.cardTitle);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(duration, midX, cardTop + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.bodySm);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(route, midX, cardTop + 16);

  doc.setFontSize(FONT.body);
  doc.text(stopsLabel(segments), margin + maxW - pad, cardTop + 11, { align: "right" });

  let cy = cardTop + summaryH;
  for (const seg of segments) {
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.2);
    doc.line(margin + pad, cy, margin + maxW - pad, cy);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT.body);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(fmtWhenLong(seg.departing_at), margin + pad, cy + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT.bodySm);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    const dep = doc.splitTextToSize(
      airportLine(seg.origin_name, seg.origin_iata, seg.origin_terminal, "Depart from"),
      maxW * 0.48,
    );
    doc.text(dep, margin + maxW * 0.5, cy + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT.body);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(fmtWhenLong(seg.arriving_at), margin + pad, cy + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT.bodySm);
    const arr = doc.splitTextToSize(
      airportLine(seg.destination_name, seg.destination_iata, seg.destination_terminal, "Arrive at"),
      maxW * 0.48,
    );
    doc.text(arr, margin + maxW * 0.5, cy + 17);

    cy += segBlockH;
  }

  const metaY = cardTop + cardH - 4;
  doc.setFillColor(PANEL.r, PANEL.g, PANEL.b);
  doc.rect(margin + 0.4, metaY - metaBarH + 2, maxW - 0.8, metaBarH, "F");
  doc.setFontSize(FONT.meta);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const meta = [
    cabinLabel(first.cabin_class),
    carrier,
    first.fare_brand_name,
    flightNumberDisplay(first),
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(meta, margin + pad, metaY);

  return cardTop + cardH + LAYOUT.blockGap;
}

function sliceFlightInfoLine(slice: FlightSliceDTO): string {
  const segs = slice.segments ?? [];
  const dep = segs[0]?.departing_at;
  const origin = slice.origin_iata || segs[0]?.origin_iata || "";
  const dest = slice.destination_iata || segs[segs.length - 1]?.destination_iata || "";
  const when = dep ? fmtWhenLong(dep) : "";
  return `${origin} to ${dest}${when ? ` on ${when}` : ""}`;
}

function drawPassengerCard(
  doc: JsPdfDoc,
  p: ItineraryPdfPassenger,
  index: number,
  slices: FlightSliceDTO[],
  margin: number,
  maxW: number,
  y: number,
): number {
  const infoLines = slices.map(sliceFlightInfoLine);
  const pad = LAYOUT.cardInnerPad;
  const routeBlockH = 13;
  const typeH = 6;
  const gridH = 18;
  const baggageH = 6;
  const routeGap = 2;
  const infoBlockH = infoLines.length * (routeBlockH + routeGap);
  const contentH = typeH + 3 + gridH + infoBlockH + (infoLines.length > 0 ? 3 : 0) + baggageH;
  const cardPad = 8;
  const cardH = contentH + cardPad;
  const cardTop = y;

  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cardTop, maxW, cardH, LAYOUT.cardRadius, LAYOUT.cardRadius, "S");

  let cy = centeredBlockTop(cardTop, cardH, contentH);

  doc.setFontSize(FONT.label);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(passengerTypeLabel(p, index), margin + pad + 1, cy + 4);
  cy += typeH + 3;

  const colW = (maxW - (pad + 1) * 2) / 3;
  const cols = [
    { label: "Name", value: passengerLine(p) },
    { label: "Date of birth", value: fmtBornOn(p.born_on) },
    { label: "Gender", value: formatGender(p.gender) },
  ];
  cols.forEach((c, i) => {
    const x = margin + pad + 1 + i * colW;
    doc.setFontSize(FONT.labelSm);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(c.label, x, cy);
    doc.setFontSize(FONT.bodyMd);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(doc.splitTextToSize(c.value, colW - 2)[0] ?? "—", x, cy + 7);
  });
  cy += gridH;

  for (const line of infoLines) {
    doc.setFillColor(PANEL.r, PANEL.g, PANEL.b);
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin + pad, cy, maxW - pad * 2, routeBlockH, 1.5, 1.5, "FD");
    doc.setFontSize(FONT.bodySm);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(line, margin + pad + 2, cy + routeBlockH / 2 + 1.5);
    cy += routeBlockH + routeGap;
  }

  if (infoLines.length > 0) cy += 3;

  doc.setFontSize(FONT.labelSm);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Baggage allowance per your fare rules", margin + pad + 2, cy + 4);

  return cardTop + cardH + LAYOUT.blockGap;
}

/**
 * Portrait A4 itinerary PDF — Duffel-inspired monochrome brand invoice (not a boarding pass).
 */
export async function buildFlightItineraryPdfBuffer(input: BuildItineraryPdfInput): Promise<Buffer> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = LAYOUT.pageMargin;
  const maxW = pageW - margin * 2;
  let y: number = margin;

  const paintWatermark = () => drawBrandWatermark(doc, pageW, pageH);

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - LAYOUT.pageBottomReserve) {
      doc.addPage();
      paintWatermark();
      y = margin;
    }
  };

  paintWatermark();
  y = await drawBrandHeader(doc, input, margin, pageW);
  y += LAYOUT.blockGap;

  if (input.isHoldBooking) {
    const holdH = 14;
    ensureSpace(holdH + 4);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin, y, maxW, holdH, 2, 2, "FD");
    doc.setFontSize(FONT.bodySm);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    const holdMsg = doc.splitTextToSize(
      "Payment pending — this itinerary is provisional until the fare is paid in full.",
      maxW - LAYOUT.cardInnerPad * 2,
    );
    doc.text(holdMsg, margin + LAYOUT.cardInnerPad, y + holdH / 2 + 1);
    y += holdH + LAYOUT.blockGap;
  }

  const slices = input.offer?.slices ?? [];

  ensureSpace(22);
  y = drawSectionTitle(doc, "Flight details", margin, y);

  if (slices.length === 0) {
    doc.setFontSize(FONT.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    const msg = doc.splitTextToSize(
      "Flight segment details are not available. View your booking online for the latest schedule.",
      maxW,
    );
    for (const line of msg) {
      doc.text(line, margin, y);
      y += 6;
    }
    y += LAYOUT.blockGap;
  } else {
    for (const slice of slices) {
      ensureSpace(80);
      y = await drawFlightSliceCard(doc, slice, margin, maxW, y);
    }
  }

  ensureSpace(28);
  y = drawSectionTitle(doc, "Passengers", margin, y);
  const paxList =
    input.passengers.length > 0
      ? input.passengers
      : [{ given_name: null, family_name: null, born_on: null, gender: null, type: "adult" }];
  for (let i = 0; i < paxList.length; i++) {
    ensureSpace(60);
    y = drawPassengerCard(doc, paxList[i], i, slices, margin, maxW, y);
  }

  ensureSpace(26);
  y = drawSectionTitle(doc, "Ticket numbers", margin, y);
  const pnr = input.airlineRecordLocator?.trim() || "Pending from airline";
  const ticketBoxTop = y;
  doc.setFontSize(FONT.bodyMd);
  doc.setFont("helvetica", "normal");
  const ticketLines = paxList.map((p) => `${passengerLine(p)}: ${pnr}`);
  const ticketLineHeights = ticketLines.map((line) => doc.getTextDimensions(line).h);
  const ticketLineGap = ticketLines.length > 1 ? 3 : 0;
  const ticketContentH =
    ticketLineHeights.reduce((sum, h) => sum + h, 0) +
    ticketLineGap * Math.max(0, ticketLines.length - 1);
  const ticketPadV = 10;
  const ticketH = ticketContentH + ticketPadV;
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, ticketBoxTop, maxW, ticketH, LAYOUT.cardRadius, LAYOUT.cardRadius, "S");
  let slotTop = centeredBlockTop(ticketBoxTop, ticketH, ticketContentH);
  for (let i = 0; i < ticketLines.length; i++) {
    const lineH = ticketLineHeights[i];
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(
      ticketLines[i],
      margin + LAYOUT.cardInnerPad + 1,
      centeredTextBaselineY(slotTop, lineH, lineH),
    );
    slotTop += lineH + ticketLineGap;
  }
  y = ticketBoxTop + ticketH + LAYOUT.blockGap;

  ensureSpace(26);
  doc.setFillColor(PANEL.r, PANEL.g, PANEL.b);
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  const payH = 22;
  const payContentH = 14;
  const payTop = centeredBlockTop(y, payH, payContentH);
  doc.roundedRect(margin, y, maxW, payH, 2, 2, "FD");
  doc.setFontSize(FONT.label);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Total", margin + LAYOUT.cardInnerPad, payTop + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.total);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(moneyLine(input.currency, input.totalAmount), margin + LAYOUT.cardInnerPad, payTop + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.label);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    `${input.bookingStatus.replace(/_/g, " ")} · ${input.paymentStatus.replace(/_/g, " ")}`,
    margin + maxW - LAYOUT.cardInnerPad,
    payTop + payContentH / 2 + 1,
    { align: "right" },
  );
  y += payH + LAYOUT.blockGap;

  doc.setFontSize(FONT.footer);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const footPad = LAYOUT.cardInnerPad;
  const footTextW = maxW - footPad * 2;
  const footLineH = 6;
  const footParas = [
    "This document is your booking confirmation and itinerary — not a boarding pass.",
    `Check in with airline record locator (PNR) ${pnr}. info@traveltourup.com · traveltourup.com`,
    `Issued ${fmtWhenLong(new Date().toISOString())} · Layout v${FLIGHT_ITINERARY_PDF_LAYOUT_VERSION}`,
  ];
  const footLines = footParas.flatMap((para) => doc.splitTextToSize(para, footTextW));
  const footX = margin + footPad;
  let fy = pageH - footLines.length * footLineH - 6;
  for (const line of footLines) {
    doc.text(line, footX, fy);
    fy += footLineH;
  }

  const out = doc.output("arraybuffer");
  return Buffer.from(new Uint8Array(out));
}
