/**
 * Navbar configuration - centralized for easier maintenance and optimization.
 * Static data lives here to avoid re-creation on each render.
 */

import type { NavLink, Language, Currency } from "@/types";

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/flights", label: "Flights" },
  { href: "/hotels", label: "Hotels" },
  { href: "/cars", label: "Cars" },
  { href: "/contact", label: "Contact" },

];

export const LANGUAGES: Language[] = [
  { name: "English", code: "GB", locale: "en" },
  { name: "Urdu", code: "PK", locale: "ur" },
  { name: "Arabic", code: "SA", locale: "ar" },
  { name: "French", code: "FR", locale: "fr" },
  { name: "Russian", code: "RU", locale: "ru" },
];

export const CURRENCIES: Currency[] = [
  { name: "USD", code: "US" },
  { name: "PKR", code: "PK" },
  { name: "SAR", code: "SA" },
  { name: "EUR", code: "FR" },
];

export const FLAG_CDN_BASE = "https://flagcdn.com/w40";

export const getFlagUrl = (code: string): string =>
  `${FLAG_CDN_BASE}/${String(code).toLowerCase()}.png`;
