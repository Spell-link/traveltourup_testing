import { redirect } from "next/navigation";
import { localizedCustomerPath } from "@/i18n/locale-path";
import type { AppLocale } from "@/i18n/routing";
import { safeInternalPath } from "@/lib/auth/redirect";
import { getServerAuthz } from "@/lib/authz/session";

/**
 * Require a logged-in customer on server-rendered booking pages.
 * Redirects to login with `next` preserving the full return path.
 */
export async function requireCustomerLogin(
  locale: string,
  returnPathWithoutLocale: string,
): Promise<string> {
  const { userId } = await getServerAuthz();
  const loc = locale as AppLocale;
  const returnPath = safeInternalPath(
    localizedCustomerPath(loc, returnPathWithoutLocale),
    localizedCustomerPath(loc, "/"),
  );

  if (!userId) {
    redirect(`/${locale}/login?next=${encodeURIComponent(returnPath)}`);
  }

  return userId;
}

export function buildDetailReturnPath(
  innerPath: string,
  sp: Record<string, string | string[] | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) q.append(key, v);
    } else {
      q.set(key, value);
    }
  }
  const qs = q.toString();
  return qs ? `${innerPath}?${qs}` : innerPath;
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export function searchSessionFromParams(sp: Record<string, string | string[] | undefined>): string | null {
  return firstParam(sp.search_session)?.trim() || null;
}
