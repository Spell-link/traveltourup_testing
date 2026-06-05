import { stripLocalePrefix } from "@/i18n/locale-path";

/**
 * Allowed internal redirect targets after stripping an optional `/${locale}` prefix.
 * Covers customer app + unprefixed `/admin`.
 */
const ALLOWED_INNER_PREFIXES = [
  "/",
  "/admin",
  "/login",
  "/signup",
  "/forgot-password",
  "/profile",
  "/flights",
  "/hotels",
  "/cars",
  "/blog",
  "/payment",
  "/contact",
  "/about",
  "/terms",
  "/privacy",
  "/faqs",
  "/auth",
] as const;

function innerPathAllowed(inner: string): boolean {
  if (inner === "/") return true;
  const base = inner.split("?")[0] ?? inner;
  return ALLOWED_INNER_PREFIXES.some((p) => p !== "/" && (base === p || base.startsWith(`${p}/`)));
}

/**
 * Prevent open redirects: same-origin relative paths only, with prefix allowlist.
 */
export function safeInternalPath(raw: string | undefined, fallback = "/"): string {
  if (!raw || raw.length === 0) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\") || raw.includes("://")) return fallback;

  const inner = stripLocalePrefix(raw.split("#")[0] ?? raw);
  const innerNoQuery = inner.split("?")[0] ?? inner;

  if (!innerPathAllowed(innerNoQuery)) return fallback;
  return raw.split("#")[0] ?? raw;
}

/** `next` targets the admin app (no locale prefix on `/admin`). */
export function isAdminReturnPath(raw: string | undefined): boolean {
  const inner = stripLocalePrefix(safeInternalPath(raw, "/"));
  return inner === "/admin" || inner.startsWith("/admin/");
}
