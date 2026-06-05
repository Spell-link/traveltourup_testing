import "server-only";

import { fitImageInBoxMm, loadRemoteImagePngForPdf } from "@/lib/brand/remote-image-pdf";
import { HOTEL_CONFIRMATION_PDF_LAYOUT_VERSION } from "@/lib/hotels/confirmation-pdf.constants";
import {
  fmtPdfWhenLong,
  pdfCenteredBlockTop,
  pdfMoneyLine,
  PDF_BORDER,
  PDF_FONT,
  PDF_INK,
  PDF_LAYOUT,
  PDF_MUTED,
  PDF_PANEL,
  createBookingPdfDocument,
  drawPdfBrandHeader,
  drawPdfBrandWatermark,
  drawPdfSectionTitle,
  pdfPageMetrics,
  type JsPdfDoc,
} from "@/lib/pdf/brand-pdf-layout";
import type { StaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import { formatStayDateLong } from "@/lib/stays/stays-booking-display";

export type BuildHotelConfirmationPdfInput = {
  bookingRefNo: string;
  hotelConfirmationRef: string | null;
  display: StaysBookingDisplay;
  bookingStatus: string;
  paymentStatus: string;
};

const HOTEL_PHOTO_W = 28;
const HOTEL_PHOTO_H = 21;
const HOTEL_PHOTO_RADIUS = 2;

function fmtStayYmd(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  return formatStayDateLong(ymd, "en-GB");
}

function fmtBornOn(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return ymd;
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(y, m - 1, d));
  } catch {
    return ymd;
  }
}

async function drawHotelPhoto(
  doc: JsPdfDoc,
  photoUrl: string | null,
  x: number,
  y: number,
): Promise<void> {
  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, HOTEL_PHOTO_W, HOTEL_PHOTO_H, HOTEL_PHOTO_RADIUS, HOTEL_PHOTO_RADIUS, "FD");

  if (!photoUrl?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONT.labelSm);
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    doc.text("HOTEL", x + HOTEL_PHOTO_W / 2, y + HOTEL_PHOTO_H / 2, { align: "center", baseline: "middle" });
    return;
  }

  const raster = await loadRemoteImagePngForPdf(photoUrl, 400);
  if (!raster) return;

  const pad = 0.6;
  const innerW = HOTEL_PHOTO_W - pad * 2;
  const innerH = HOTEL_PHOTO_H - pad * 2;
  const { w, h } = fitImageInBoxMm(raster.widthPx, raster.heightPx, innerW, innerH);
  const drawX = x + pad + (innerW - w) / 2;
  const drawY = y + pad + (innerH - h) / 2;
  const b64 = raster.buffer.toString("base64");
  doc.addImage(`data:image/png;base64,${b64}`, "PNG", drawX, drawY, w, h);
}

async function drawStayCard(
  doc: JsPdfDoc,
  input: BuildHotelConfirmationPdfInput,
  margin: number,
  maxW: number,
  y: number,
): Promise<number> {
  const d = input.display;
  const pad = PDF_LAYOUT.cardInnerPad;
  const cardTop = y;
  const summaryH = 28;
  const datesH = 22;
  const metaBarH = 10;
  const cardH = summaryH + datesH + metaBarH + pad;

  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardTop, maxW, cardH, PDF_LAYOUT.cardRadius, PDF_LAYOUT.cardRadius, "S");

  const photoX = margin + pad;
  const photoY = cardTop + (summaryH - HOTEL_PHOTO_H) / 2;
  await drawHotelPhoto(doc, d.photoUrl, photoX, photoY);

  const textX = photoX + HOTEL_PHOTO_W + 4;
  const textMaxW = maxW - (textX - margin) - pad;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.heroTitle);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  const nameLines = doc.splitTextToSize(d.accommodationName, textMaxW);
  doc.text(nameLines.slice(0, 2), textX, cardTop + 8);

  let subY = cardTop + 8 + Math.min(nameLines.length, 2) * 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT.bodySm);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);

  const address = [d.addressLine, d.city, d.countryCode].filter(Boolean).join(", ");
  if (address) {
    const addrLines = doc.splitTextToSize(address, textMaxW);
    doc.text(addrLines.slice(0, 2), textX, subY);
    subY += Math.min(addrLines.length, 2) * 5;
  }

  const metaBits = [
    d.stars != null && d.stars > 0 ? `${d.stars}★` : null,
    d.roomName ? d.roomName : null,
    d.mealPlanLabel ?? null,
  ].filter(Boolean);
  if (metaBits.length > 0) {
    doc.text(metaBits.join("   ·   "), textX, Math.min(subY + 2, cardTop + summaryH - 3));
  }

  const datesY = cardTop + summaryH;
  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.2);
  doc.line(margin + pad, datesY, margin + maxW - pad, datesY);

  const colMid = margin + maxW * 0.5;
  doc.line(colMid, datesY, colMid, datesY + datesH);

  const checkInLabelY = datesY + 7;
  doc.setFontSize(PDF_FONT.labelSm);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text("Check-in", margin + pad + 1, checkInLabelY);
  doc.text("Check-out", colMid + pad, checkInLabelY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.body);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(fmtStayYmd(d.checkInDate), margin + pad + 1, checkInLabelY + 6);
  doc.text(fmtStayYmd(d.checkOutDate), colMid + pad, checkInLabelY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT.bodySm);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  if (d.checkInAfterTime) {
    doc.text(`From ${d.checkInAfterTime}`, margin + pad + 1, checkInLabelY + 12);
  }
  if (d.checkOutBeforeTime) {
    doc.text(`Before ${d.checkOutBeforeTime}`, colMid + pad, checkInLabelY + 12);
  }

  if (d.nights != null) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONT.bodySm);
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(
      `${d.nights} night${d.nights === 1 ? "" : "s"}`,
      margin + maxW - pad,
      checkInLabelY + 6,
      { align: "right" },
    );
  }

  const metaY = cardTop + cardH - 4;
  doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
  doc.rect(margin + 0.4, metaY - metaBarH + 2, maxW - 0.8, metaBarH, "F");
  doc.setFontSize(PDF_FONT.meta);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  const conf = input.hotelConfirmationRef?.trim();
  const meta = [
    conf ? `Hotel confirmation ${conf}` : null,
    d.roomsCount != null ? `${d.roomsCount} room${d.roomsCount === 1 ? "" : "s"}` : null,
    d.guestsCount != null ? `${d.guestsCount} guest${d.guestsCount === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  if (meta) doc.text(meta, margin + pad, metaY);

  return cardTop + cardH + PDF_LAYOUT.blockGap;
}

function drawGuestCard(
  doc: JsPdfDoc,
  guest: { fullName: string; bornOn: string | null },
  index: number,
  margin: number,
  maxW: number,
  y: number,
): number {
  const pad = PDF_LAYOUT.cardInnerPad;
  const typeH = 5;
  const gridH = 14;
  const contentH = typeH + 2 + gridH;
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
  doc.text(`GUEST ${index + 1}`, margin + pad + 1, cy + 3.5);
  cy += typeH + 2;

  const colW = (maxW - (pad + 1) * 2) / 2;
  const cols = [
    { label: "Name", value: guest.fullName },
    { label: "Date of birth", value: fmtBornOn(guest.bornOn) },
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

  return cardTop + cardH + PDF_LAYOUT.blockGap;
}

function drawKeyValueCard(
  doc: JsPdfDoc,
  rows: { label: string; value: string }[],
  margin: number,
  maxW: number,
  y: number,
): number {
  const pad = PDF_LAYOUT.cardInnerPad;
  const rowH = 10;
  const cardH = rows.length * rowH + pad * 2 + 2;
  const cardTop = y;

  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardTop, maxW, cardH, PDF_LAYOUT.cardRadius, PDF_LAYOUT.cardRadius, "S");

  let cy = cardTop + pad + 5;
  for (const row of rows) {
    doc.setFontSize(PDF_FONT.labelSm);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    doc.text(row.label, margin + pad + 1, cy);
    doc.setFontSize(PDF_FONT.body);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    const valLines = doc.splitTextToSize(row.value, maxW * 0.58);
    doc.text(valLines[0] ?? "—", margin + maxW * 0.38, cy);
    cy += rowH;
  }

  return cardTop + cardH + PDF_LAYOUT.blockGap;
}

type PaymentRow = { label: string; amount: string; bold?: boolean };

function drawPaymentCard(
  doc: JsPdfDoc,
  rows: PaymentRow[],
  totalRow: PaymentRow,
  statusLine: string,
  margin: number,
  maxW: number,
  y: number,
): number {
  const pad = PDF_LAYOUT.cardInnerPad;
  const lineH = 9;
  const cardH = (rows.length + 2) * lineH + pad * 2 + 8;
  const cardTop = y;

  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cardTop, maxW, cardH, PDF_LAYOUT.cardRadius, PDF_LAYOUT.cardRadius, "S");

  let cy = cardTop + pad + 7;
  for (const row of rows) {
    doc.setFontSize(PDF_FONT.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    doc.text(row.label, margin + pad + 1, cy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(row.amount, margin + maxW - pad - 1, cy, { align: "right" });
    cy += lineH;
  }

  const divY = cy + 1;
  doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
  doc.setLineWidth(0.25);
  doc.line(margin + pad, divY, margin + maxW - pad, divY);
  cy = divY + lineH;

  doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
  doc.rect(margin + 0.5, cy - 5, maxW - 1, lineH + 4, "F");
  doc.setFontSize(PDF_FONT.label);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text(totalRow.label, margin + pad + 1, cy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_FONT.total);
  doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
  doc.text(totalRow.amount, margin + maxW - pad - 1, cy, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PDF_FONT.meta);
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text(statusLine, margin + pad + 1, cardTop + cardH - 4);

  return cardTop + cardH + PDF_LAYOUT.blockGap;
}

function drawNoticeCard(doc: JsPdfDoc, text: string, margin: number, maxW: number, y: number): number {
  const pad = PDF_LAYOUT.cardInnerPad;
  const lines = doc.splitTextToSize(text, maxW - pad * 2);
  const cardH = lines.length * 5.5 + pad * 2 + 4;
  const cardTop = y;

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(253, 230, 138);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, cardTop, maxW, cardH, 2, 2, "FD");
  doc.setFontSize(PDF_FONT.bodySm);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(146, 64, 14);
  let cy = cardTop + pad + 5;
  for (const line of lines) {
    doc.text(line, margin + pad, cy);
    cy += 5.5;
  }
  return cardTop + cardH + PDF_LAYOUT.blockGap;
}

/**
 * Portrait A4 hotel confirmation — Duffel-inspired monochrome style (matches flight itinerary).
 */
export async function buildHotelConfirmationPdfBuffer(
  input: BuildHotelConfirmationPdfInput,
): Promise<Buffer> {
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

  doc.setFontSize(PDF_FONT.bodySm);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  doc.text("Hotel booking confirmation", margin, y);
  y += 4;

  ensureSpace(70);
  y = drawPdfSectionTitle(doc, "Stay details", margin, y);
  y = await drawStayCard(doc, input, margin, maxW, y);

  const d = input.display;
  if (d.guests.length > 0) {
    ensureSpace(40);
    y = drawPdfSectionTitle(doc, "Guests", margin, y);
    for (let i = 0; i < d.guests.length; i++) {
      ensureSpace(36);
      y = drawGuestCard(doc, d.guests[i], i, margin, maxW, y);
    }
  }

  const contactRows: { label: string; value: string }[] = [];
  if (d.contactEmail) contactRows.push({ label: "Email", value: d.contactEmail });
  if (d.contactPhone) contactRows.push({ label: "Phone", value: d.contactPhone });
  if (contactRows.length > 0) {
    ensureSpace(30);
    y = drawPdfSectionTitle(doc, "Contact", margin, y);
    y = drawKeyValueCard(doc, contactRows, margin, maxW, y);
  }

  const extraRows: { label: string; value: string }[] = [];
  if (d.specialRequests) extraRows.push({ label: "Special requests", value: d.specialRequests });
  if (d.loyaltyProgrammeAccountNumber) {
    extraRows.push({ label: "Loyalty programme", value: d.loyaltyProgrammeAccountNumber });
  }
  if (extraRows.length > 0) {
    ensureSpace(30);
    y = drawPdfSectionTitle(doc, "Additional information", margin, y);
    y = drawKeyValueCard(doc, extraRows, margin, maxW, y);
  }

  const paidCur = (d.billing.totalPaidCurrency ?? d.billing.totalCurrency).toUpperCase();
  const roomCur = (d.billing.supplierCurrency ?? d.billing.roomCurrency ?? paidCur).toUpperCase();
  const paymentRows: PaymentRow[] = [];
  const roomAmt = pdfMoneyLine(roomCur, d.billing.supplierAmount ?? d.billing.roomAmount);
  if (roomAmt) paymentRows.push({ label: "Room rate", amount: roomAmt });
  const feeN = Number.parseFloat(d.billing.serviceFeeAmount ?? "0");
  if (Number.isFinite(feeN) && feeN > 0) {
    const feeAmt = pdfMoneyLine(paidCur, d.billing.serviceFeeAmount);
    if (feeAmt) paymentRows.push({ label: "Service fee", amount: feeAmt });
  }
  const totalAmt = pdfMoneyLine(
    paidCur,
    d.billing.totalPaidAmount ?? d.billing.customerChargeAmount ?? d.billing.totalAmount,
  );

  ensureSpace(40);
  y = drawPdfSectionTitle(doc, "Payment summary", margin, y);
  if (paymentRows.length > 0 && totalAmt) {
    y = drawPaymentCard(
      doc,
      paymentRows,
      { label: "Total paid", amount: totalAmt },
      `${input.bookingStatus.replace(/_/g, " ")} · ${input.paymentStatus.replace(/_/g, " ")}`,
      margin,
      maxW,
      y,
    );
  } else if (totalAmt) {
    const payH = 18;
    const payContentH = 12;
    const payTop = pdfCenteredBlockTop(y, payH, payContentH);
    doc.setFillColor(PDF_PANEL.r, PDF_PANEL.g, PDF_PANEL.b);
    doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
    doc.roundedRect(margin, y, maxW, payH, 2, 2, "FD");
    doc.setFontSize(PDF_FONT.label);
    doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
    doc.text("Total paid", margin + PDF_LAYOUT.cardInnerPad, payTop + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_FONT.total);
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    doc.text(totalAmt, margin + PDF_LAYOUT.cardInnerPad, payTop + 9);
    y += payH + PDF_LAYOUT.blockGap;
  }

  const dueN = Number.parseFloat(d.billing.dueAtAccommodationAmount ?? "0");
  if (Number.isFinite(dueN) && dueN > 0) {
    const dueAmt = pdfMoneyLine(
      d.billing.dueAtAccommodationCurrency ?? paidCur,
      d.billing.dueAtAccommodationAmount,
    );
    if (dueAmt) {
      ensureSpace(24);
      y = drawNoticeCard(
        doc,
        `Due at accommodation: ${dueAmt}. Pay at the property during your stay — not included in your card charge above.`,
        margin,
        maxW,
        y,
      );
    }
  }

  if (d.cancellationPolicySummary) {
    ensureSpace(28);
    y = drawPdfSectionTitle(doc, "Cancellation policy", margin, y);
    const pad = PDF_LAYOUT.cardInnerPad;
    const lines = doc.splitTextToSize(d.cancellationPolicySummary, maxW - pad * 2);
    const boxH = lines.length * 5.5 + pad * 2 + 6;
    doc.setDrawColor(PDF_BORDER.r, PDF_BORDER.g, PDF_BORDER.b);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, maxW, boxH, PDF_LAYOUT.cardRadius, PDF_LAYOUT.cardRadius, "S");
    doc.setFontSize(PDF_FONT.bodySm);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_INK.r, PDF_INK.g, PDF_INK.b);
    let cy = y + pad + 6;
    for (const line of lines) {
      doc.text(line, margin + pad, cy);
      cy += 5.5;
    }
    y += boxH + PDF_LAYOUT.blockGap;
  }

  doc.setFontSize(PDF_FONT.footer);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_MUTED.r, PDF_MUTED.g, PDF_MUTED.b);
  const footPad = PDF_LAYOUT.cardInnerPad;
  const footTextW = maxW - footPad * 2;
  const footLineH = 4.5;
  const conf = input.hotelConfirmationRef?.trim();
  const footParas = [
    "Present this confirmation and photo ID at check-in. This document is not a hotel voucher unless your rate requires one.",
    conf
      ? `Hotel confirmation ${conf}. info@traveltourup.com · traveltourup.com`
      : "info@traveltourup.com · traveltourup.com",
    `Issued ${fmtPdfWhenLong(new Date().toISOString())} · Layout v${HOTEL_CONFIRMATION_PDF_LAYOUT_VERSION}`,
  ];
  const footLines = footParas.flatMap((para) => doc.splitTextToSize(para, footTextW));
  let fy = pageH - footLines.length * footLineH - 8;
  for (const line of footLines) {
    doc.text(line, margin + footPad, fy);
    fy += footLineH;
  }

  const out = doc.output("arraybuffer");
  return Buffer.from(new Uint8Array(out));
}
