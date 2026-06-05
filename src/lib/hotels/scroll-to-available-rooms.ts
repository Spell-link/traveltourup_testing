/** DOM id for the hotel detail "Available rooms" block (main column). */
export const HOTEL_AVAILABLE_ROOMS_SECTION_ID = "hotel-available-rooms";

/** Sticky header offset — matches `lg:top-24` / navbar clearance used across detail pages. */
const DESKTOP_SCROLL_OFFSET_PX = 96;
const MOBILE_SCROLL_OFFSET_PX = 72;

/**
 * Smooth-scroll to the available rooms section. Returns false when the anchor is missing.
 * Uses `window.scrollTo` + measured offset so fixed header / mobile bars are accounted for.
 */
export function scrollToHotelAvailableRooms(): boolean {
  if (typeof window === "undefined") return false;

  const el = document.getElementById(HOTEL_AVAILABLE_ROOMS_SECTION_ID);
  if (!el) return false;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  const offset = isDesktop ? DESKTOP_SCROLL_OFFSET_PX : MOBILE_SCROLL_OFFSET_PX;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });

  return true;
}
