"use client";

import type { BookingDetailDto, BookingListItemDto } from "@/lib/bookings/booking.types";
import { ApiRequestError, apiJson, apiPaginatedJson } from "@/lib/http/api-client";

const BOOKINGS_V1_BASE = "/api/v1/bookings";

export async function listMyBookings(params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  q?: string;
  sort?: "created_at" | "total_amount" | "status" | "booking_ref_no";
  order?: "asc" | "desc";
}) {
  return apiPaginatedJson<BookingListItemDto>(BOOKINGS_V1_BASE, params);
}

export async function getBooking(id: string): Promise<BookingDetailDto> {
  return apiJson<BookingDetailDto>(`${BOOKINGS_V1_BASE}/${encodeURIComponent(id)}`);
}

export async function postBookingItineraryRegenerate(bookingId: string): Promise<{ ok: boolean }> {
  return apiJson<{ ok: boolean }>(
    `${BOOKINGS_V1_BASE}/${encodeURIComponent(bookingId)}/itinerary`,
    { method: "POST", body: {} },
  );
}

/** Fetches itinerary PDF and triggers a browser download with loading-friendly fetch (not a raw `<a href>`). */
export async function downloadBookingItineraryPdf(
  bookingId: string,
  filename: string,
): Promise<void> {
  const res = await fetch(`${BOOKINGS_V1_BASE}/${encodeURIComponent(bookingId)}/itinerary`, {
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    let message = "Could not download itinerary";
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (text.trim()) message = text.trim();
    }
    throw new ApiRequestError(message, res.status, {});
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
