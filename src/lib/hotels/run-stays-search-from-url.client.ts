"use client";

import {
  postStaysSearch,
  TTU_STAYS_SEARCH_SESSION_KEY,
  TTU_STAYS_SEARCH_PENDING_KEY,
  TTU_STAYS_SEARCH_STARTED_EVENT,
  TTU_STAYS_SEARCH_UPDATED_EVENT,
} from "@/lib/http/stays.client";
import type { StaysSearchFromUrlResult } from "@/lib/hotels/search-from-url";

/**
 * Runs a stays search from parsed URL params and persists to sessionStorage
 * (same shape as {@link HotelsTab.handleStaysSearch}).
 */
export async function runStaysSearchFromUrlResult(parsed: StaysSearchFromUrlResult): Promise<void> {
  sessionStorage.setItem(TTU_STAYS_SEARCH_PENDING_KEY, "1");
  sessionStorage.removeItem(TTU_STAYS_SEARCH_SESSION_KEY);
  window.dispatchEvent(new Event(TTU_STAYS_SEARCH_STARTED_EVENT));

  try {
    const data = await postStaysSearch(parsed.apiBody);
    sessionStorage.setItem(
      TTU_STAYS_SEARCH_SESSION_KEY,
      JSON.stringify({
        context: {
          check_in_date: parsed.context.check_in_date,
          check_out_date: parsed.context.check_out_date,
          rooms: parsed.context.rooms,
          adults: parsed.context.adults,
          children: parsed.context.children,
          destination: parsed.context.destination,
        },
        ...data,
      }),
    );
    sessionStorage.removeItem(TTU_STAYS_SEARCH_PENDING_KEY);
    window.dispatchEvent(new Event(TTU_STAYS_SEARCH_UPDATED_EVENT));
  } catch {
    sessionStorage.removeItem(TTU_STAYS_SEARCH_PENDING_KEY);
    sessionStorage.removeItem(TTU_STAYS_SEARCH_SESSION_KEY);
    window.dispatchEvent(new Event(TTU_STAYS_SEARCH_UPDATED_EVENT));
    throw new Error("Stays search failed");
  }
}

/** True when session already has results or a search is in flight. */
export function hasStaysSessionOrPending(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(TTU_STAYS_SEARCH_PENDING_KEY) === "1") return true;
  const raw = sessionStorage.getItem(TTU_STAYS_SEARCH_SESSION_KEY);
  if (!raw) return false;
  try {
    const j = JSON.parse(raw) as { results?: unknown[] };
    return Array.isArray(j.results) && j.results.length > 0;
  } catch {
    return false;
  }
}
