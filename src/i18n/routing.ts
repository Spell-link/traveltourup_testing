import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ur", "ar", "fr", "ru"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

/** Canonical locale segment for admin gate login URLs (`/en/login?next=/admin`). */
export const ADMIN_GATE_LOCALE: AppLocale = "en";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "as-needed",
});
