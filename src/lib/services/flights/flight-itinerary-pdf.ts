import "server-only";

import type { FlightOfferDTO, FlightSegmentDTO, FlightSliceDTO } from "@/lib/duffel/dto/flight-offer.dto";
import {
  loadCarrierLogoPngForPdf,
  resolveCarrierLogoUrl,
} from "@/lib/brand/carrier-logo-pdf-image";
import { FLIGHT_ITINERARY_PDF_LAYOUT_VERSION } from "@/lib/flights/itinerary-pdf.constants";
import {
  createBookingPdfDocument,
  drawPdfBrandHeader,
  drawPdfBrandWatermark,
  drawPdfSectionTitle,
  fmtPdfWhenLong,
  pdfCenteredBlockTop,
  pdfCenteredTextBaselineY,
  pdfPageMetrics,
  pdfTextRightAligned,
  PDF_BORDER,
  PDF_FONT,
  PDF_INK,
  PDF_LAYOUT,
  PDF_MUTED,
  PDF_PANEL,
  type JsPdfDoc,
} from "@/lib/pdf/brand-pdf-layout";

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

const CARRIER_ICON_SIZE_MM = 10;
const CARRIER_ICON_PADDING_MM = 1;
const CARRIER_ICON_RADIUS_MM = 1.5;

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

  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
  doc.setLineWidth(0.2);
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
  doc.setFontSize(PDF_FONT.carrierFallback);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text(code, x + boxSize / 2, y + boxSize / 2, { align: "center", baseline: "middle" });
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
  const pad = PDF_LAYOUT.cardInnerPad;
  const summaryH = 20;
  const segBlockH = 36;
  const metaBarH = 9;
  const cardTop = y;
  const cardH = summaryH + segments.length * segBlockH + metaBarH + pad;
  const rightX = margin + maxW - pad;
  const iconY = cardTop + (summaryH - CARRIER_ICON_SIZE_MM) / 2;

  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardTop, maxW, cardH, PDF_LAYOUT.cardRadius, PDF_LAYOUT.cardRadius, "S");

  await drawCarrierMark(doc, first, margin + pad, iconY);

  const textX = margin + pad + CARRIER_ICON_SIZE_MM + 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.cardTitle);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(timeRange, textX, cardTop + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT.bodySm);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text(carrier, textX, cardTop + 14);

  const midX = margin + maxW * 0.52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.cardTitle);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(duration, midX, cardTop + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT.bodySm);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text(route, midX, cardTop + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.body);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(stopsLabel(segments), rightX, cardTop + 11, { align: "right" });

  let cy = cardTop + summaryH;
  for (const seg of segments) {
    doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
    doc.setLineWidth(0.15);
    doc.line(margin + pad, cy, rightX, cy);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONT.body);
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(fmtPdfWhenLong(seg.departing_at), margin + pad, cy + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONT.bodySm);
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    const depLines = doc.splitTextToSize(
      airportLine(seg.origin_name, seg.origin_iata, seg.origin_terminal, "Depart from"),
      maxW * 0.46,
    );
    pdfTextRightAligned(doc, depLines.slice(0, 2), rightX, cy + 5.5, 4);

    const segDur = formatIsoDuration(seg.duration);
    if (segDur) {
      doc.setFontSize(PDF_FONT.labelSm);
      doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
      doc.text(`Flight duration: ${segDur}`, margin + pad, cy + 14);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONT.body);
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(fmtPdfWhenLong(seg.arriving_at), margin + pad, cy + 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(PDF_FONT.bodySm);
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    const arrLines = doc.splitTextToSize(
      airportLine(seg.destination_name, seg.destination_iata, seg.destination_terminal, "Arrive at"),
      maxW * 0.46,
    );
    pdfTextRightAligned(doc, arrLines.slice(0, 2), rightX, cy + 22, 4);

    cy += segBlockH;
  }

  const metaY = cardTop + cardH - 3;
  doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
  doc.rect(margin + 0.4, metaY - metaBarH + 1, maxW - 0.8, metaBarH, "F");
  doc.setFontSize(PDF_FONT.meta);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  const meta = [cabinLabel(first.cabin_class), carrier, first.fare_brand_name, flightNumberDisplay(first)]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(meta, margin + pad, metaY);

  return cardTop + cardH + PDF_LAYOUT.blockGap;
}

function sliceFlightInfoLine(slice: FlightSliceDTO): string {
  const segs = slice.segments ?? [];
  const dep = segs[0]?.departing_at;
  const origin = slice.origin_iata || segs[0]?.origin_iata || "";
  const dest = slice.destination_iata || segs[segs.length - 1]?.destination_iata || "";
  const when = dep ? fmtPdfWhenLong(dep) : "";
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
  const pad = PDF_LAYOUT.cardInnerPad;
  const routeBlockH = 11;
  const typeH = 5;
  const gridH = 14;
  const baggageH = 5;
  const routeGap = 2;
  const infoBlockH = infoLines.length * (routeBlockH + routeGap);
  const contentH = typeH + 2 + gridH + infoBlockH + (infoLines.length > 0 ? 2 : 0) + baggageH;
  const cardPad = 6;
  const cardH = contentH + cardPad;
  const cardTop = y;

  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardTop, maxW, cardH, PDF_LAYOUT.cardRadius, PDF_LAYOUT.cardRadius, "S");

  let cy = pdfCenteredBlockTop(cardTop, cardH, contentH);

  doc.setFontSize(PDF_FONT.label);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text(passengerTypeLabel(p, index), margin + pad + 1, cy + 3.5);
  cy += typeH + 2;

  const colW = (maxW - (pad + 1) * 2) / 3;
  const cols = [
    { label: "Name", value: passengerLine(p) },
    { label: "Date of birth", value: fmtBornOn(p.born_on) },
    { label: "Gender", value: formatGender(p.gender) },
  ];
  cols.forEach((c, i) => {
    const x = margin + pad + 1 + i * colW;
    doc.setFontSize(PDF_FONT.labelSm);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    doc.text(c.label, x, cy);
    doc.setFontSize(PDF_FONT.bodyMd);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(doc.splitTextToSize(c.value, colW - 2)[0] ?? "—", x, cy + 5.5);
  });
  cy += gridH;

  for (const line of infoLines) {
    doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
    doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
    doc.setLineWidth(0.15);
    doc.roundedRect(margin + pad, cy, maxW - pad * 2, routeBlockH, 1.5, 1.5, "FD");
    doc.setFontSize(PDF_FONT.bodySm);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(line, margin + pad + 2, cy + routeBlockH / 2 + 1);
    cy += routeBlockH + routeGap;
  }

  if (infoLines.length > 0) cy += 2;

  doc.setFontSize(PDF_FONT.labelSm);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text("Baggage allowance per your fare rules", margin + pad + 2, cy + 3.5);

  return cardTop + cardH + PDF_LAYOUT.blockGap;
}

export async function buildFlightItineraryPdfBuffer(input: BuildItineraryPdfInput): Promise<Buffer> {
  const { default: jsPDF } = await import("jspdf");
  const doc = createBookingPdfDocument(jsPDF);
  const { pageW, pageH, margin, maxW } = pdfPageMetrics(doc);
  let y: number = margin;

  const paintWatermark = () => drawPdfBrandWatermark(doc, pageW, pageH);

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - PDF_LAYOUT.pageBottomReserve) {
      doc.addPage();
      paintWatermark();
      y = margin;
    }
  };

  paintWatermark();
  y = await drawPdfBrandHeader(doc, input.bookingRefNo, margin, pageW);
  y += 2;

  if (input.isHoldBooking) {
    const holdH = 12;
    ensureSpace(holdH + 2);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin, y, maxW, holdH, 2, 2, "FD");
    doc.setFontSize(PDF_FONT.bodySm);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    const holdMsg = doc.splitTextToSize(
      "Payment pending — this itinerary is provisional until the fare is paid in full.",
      maxW - PDF_LAYOUT.cardInnerPad * 2,
    );
    doc.text(holdMsg, margin + PDF_LAYOUT.cardInnerPad, y + holdH / 2 + 0.5);
    y += holdH + PDF_LAYOUT.blockGap;
  }

  const slices = input.offer?.slices ?? [];

  ensureSpace(14);
  y = drawPdfSectionTitle(doc, "Flight details", margin, y);

  if (slices.length === 0) {
    doc.setFontSize(PDF_FONT.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    const msg = doc.splitTextToSize(
      "Flight segment details are not available. View your booking online for the latest schedule.",
      maxW,
    );
    for (const line of msg) {
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += PDF_LAYOUT.blockGap;
  } else {
    for (const slice of slices) {
      ensureSpace(75);
      y = await drawFlightSliceCard(doc, slice, margin, maxW, y);
    }
  }

  ensureSpace(16);
  y = drawPdfSectionTitle(doc, "Passengers", margin, y);
  const paxList =
    input.passengers.length > 0
      ? input.passengers
      : [{ given_name: null, family_name: null, born_on: null, gender: null, type: "adult" }];
  for (let i = 0; i < paxList.length; i++) {
    ensureSpace(48);
    y = drawPassengerCard(doc, paxList[i], i, slices, margin, maxW, y);
  }

  ensureSpace(16);
  y = drawPdfSectionTitle(doc, "Ticket numbers", margin, y);
  const pnr = input.airlineRecordLocator?.trim() || "Pending from airline";
  const ticketBoxTop = y;
  doc.setFontSize(PDF_FONT.bodyMd);
  doc.setFont("helvetica", "normal");
  const ticketLines = paxList.map((p) => `${passengerLine(p)}: ${pnr}`);
  const ticketLineHeights = ticketLines.map((line) => doc.getTextDimensions(line).h);
  const ticketLineGap = ticketLines.length > 1 ? 2 : 0;
  const ticketContentH =
    ticketLineHeights.reduce((sum, h) => sum + h, 0) +
    ticketLineGap * Math.max(0, ticketLines.length - 1);
  const ticketPadV = 8;
  const ticketH = ticketContentH + ticketPadV;
  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, ticketBoxTop, maxW, ticketH, PDF_LAYOUT.cardRadius, PDF_LAYOUT.cardRadius, "S");
  let slotTop = pdfCenteredBlockTop(ticketBoxTop, ticketH, ticketContentH);
  for (let i = 0; i < ticketLines.length; i++) {
    const lineH = ticketLineHeights[i];
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(
      ticketLines[i],
      margin + PDF_LAYOUT.cardInnerPad + 1,
      pdfCenteredTextBaselineY(slotTop, lineH, lineH),
    );
    slotTop += lineH + ticketLineGap;
  }
  y = ticketBoxTop + ticketH + PDF_LAYOUT.blockGap;

  ensureSpace(16);
  doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  const payH = 18;
  const payContentH = 12;
  const payTop = pdfCenteredBlockTop(y, payH, payContentH);
  doc.roundedRect(margin, y, maxW, payH, 2, 2, "FD");
  doc.setFontSize(PDF_FONT.label);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text("Total", margin + PDF_LAYOUT.cardInnerPad, payTop + 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.total);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(moneyLine(input.currency, input.totalAmount), margin + PDF_LAYOUT.cardInnerPad, payTop + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT.label);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text(
    `${input.bookingStatus.replace(/_/g, " ")} · ${input.paymentStatus.replace(/_/g, " ")}`,
    margin + maxW - PDF_LAYOUT.cardInnerPad,
    payTop + payContentH / 2 + 0.5,
    { align: "right" },
  );
  y += payH + PDF_LAYOUT.blockGap;

  doc.setFontSize(PDF_FONT.footer);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  const footPad = PDF_LAYOUT.cardInnerPad;
  const footTextW = maxW - footPad * 2;
  const footLineH = 4.5;
  const footParas = [
    "This document is your booking confirmation and itinerary — not a boarding pass.",
    `Check in with airline record locator (PNR) ${pnr}. info@traveltourup.com · traveltourup.com`,
    `Issued ${fmtPdfWhenLong(new Date().toISOString())} · Layout v${FLIGHT_ITINERARY_PDF_LAYOUT_VERSION}`,
  ];
  const footLines = footParas.flatMap((para) => doc.splitTextToSize(para, footTextW));
  const footX = margin + footPad;
  let fy = pageH - footLines.length * footLineH - 8;
  for (const line of footLines) {
    doc.text(line, footX, fy);
    fy += footLineH;
  }

  const out = doc.output("arraybuffer");
  return Buffer.from(new Uint8Array(out));
}
