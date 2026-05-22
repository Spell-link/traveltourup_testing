import { flightSearchBodyFromUrl } from "@/lib/flights/search-from-url";

/** Last `/flights?…` results URL (path + query, no locale prefix). */
export const FLIGHT_LAST_SEARCH_PATH_KEY = "ttu_flight_last_search_path";

/**
 * Stores a validated flight results path for post-checkout redirect.
 * Accepts `/flights?…` or a raw query string.
 */
export function persistFlightSearchPath(pathOrQuery: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeFlightResultsPath(pathOrQuery);
  if (!normalized) return;
  try {
    sessionStorage.setItem(FLIGHT_LAST_SEARCH_PATH_KEY, normalized);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Reads the last stored flight results path, or null. */
export function readFlightSearchPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FLIGHT_LAST_SEARCH_PATH_KEY);
    return raw ? normalizeFlightResultsPath(raw) : null;
  } catch {
    return null;
  }
}

function normalizeFlightResultsPath(pathOrQuery: string): string | null {
  const trimmed = pathOrQuery.trim();
  if (!trimmed) return null;

  let path: string;
  let search: string;

  if (trimmed.startsWith("/flights")) {
    const qIdx = trimmed.indexOf("?");
    if (qIdx === -1) return null;
    path = trimmed.slice(0, qIdx);
    search = trimmed.slice(qIdx + 1);
  } else if (trimmed.startsWith("?")) {
    path = "/flights";
    search = trimmed.slice(1);
  } else if (!trimmed.includes("/")) {
    path = "/flights";
    search = trimmed;
  } else {
    return null;
  }

  if (path !== "/flights") return null;
  const sp = new URLSearchParams(search);
  if (flightSearchBodyFromUrl(sp) == null) return null;
  return `/flights?${sp.toString()}`;
}
