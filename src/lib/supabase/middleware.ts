import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { pathnameStartsWithLocale, stripLocalePrefix } from "@/i18n/locale-path";
import { isPhoneVerificationPending } from "@/lib/auth/phone-verification.core";
import { ADMIN_GATE_LOCALE, defaultLocale } from "@/i18n/routing";
import { safeInternalPath } from "@/lib/auth/redirect";

const AUTH_PATH_PREFIXES = ["/login", "/signup", "/forgot-password", "/verify-phone"] as const;
const PROTECTED_CUSTOMER_PREFIXES = ["/profile"] as const;

function isAuthInnerPath(inner: string): boolean {
  return AUTH_PATH_PREFIXES.some((p) => inner === p || inner.startsWith(`${p}/`));
}

function isVerifyPhonePath(inner: string): boolean {
  return inner === "/verify-phone" || inner.startsWith("/verify-phone/");
}

function isProtectedCustomerInner(inner: string): boolean {
  return PROTECTED_CUSTOMER_PREFIXES.some((p) => inner === p || inner.startsWith(`${p}/`));
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

/**
 * Refreshes the Supabase session cookie on each matched request.
 */
export async function updateSupabaseSession(request: NextRequest, upstreamResponse?: NextResponse) {
  let response = upstreamResponse ?? NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const inner = stripLocalePrefix(pathname);
  const locale = pathnameStartsWithLocale(pathname) ?? defaultLocale;

  const isAuthPage = isAuthInnerPath(inner);
  const isVerifyPhone = isVerifyPhonePath(inner);
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isProtectedCustomer = isProtectedCustomerInner(inner);
  const phonePending = user ? isPhoneVerificationPending(user) : false;

  if (user && phonePending && !isVerifyPhone && !isAdminArea && !pathname.startsWith("/api/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/verify-phone`;
    redirectUrl.searchParams.set("next", `${inner}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && isAuthPage) {
    if (isVerifyPhone && phonePending) {
      return response;
    }

    const rawNext = request.nextUrl.searchParams.get("next") ?? undefined;
    const next = safeInternalPath(rawNext);
    const qIndex = next.indexOf("?");
    const pathOnly = qIndex >= 0 ? next.slice(0, qIndex) : next;
    const search = qIndex >= 0 ? next.slice(qIndex) : "";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathOnly || "/";
    redirectUrl.search = search;
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!user && isAdminArea) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${ADMIN_GATE_LOCALE}/login`;
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!user && isProtectedCustomer) {
    const loc = pathnameStartsWithLocale(pathname) ?? defaultLocale;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${loc}/login`;
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}
