import "server-only";
import { duffelFetch } from "./client";

export function staysSearch(data: object) {
  return duffelFetch<unknown>("/stays/search", {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}

/** Duffel: POST `/stays/search_results/{id}/actions/fetch_all_rates` (not GET on `/fetch_all_rates`). */
export function staysFetchAllRates(searchResultId: string) {
  const id = encodeURIComponent(searchResultId);
  return duffelFetch<unknown>(`/stays/search_results/${id}/actions/fetch_all_rates`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function staysCreateQuote(rateId: string) {
  return duffelFetch<unknown>("/stays/quotes", {
    method: "POST",
    body: JSON.stringify({ data: { rate_id: rateId } }),
  });
}

export function staysGetQuote(quoteId: string) {
  return duffelFetch<unknown>(`/stays/quotes/${encodeURIComponent(quoteId)}`);
}

export function staysCreateBooking(data: object) {
  return duffelFetch<unknown>("/stays/bookings", {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}

export function staysGetBooking(bookingId: string) {
  return duffelFetch<unknown>(`/stays/bookings/${encodeURIComponent(bookingId)}`);
}
