import type { Metadata } from "next";
import { redirect } from "next/navigation";

import FlightsChangePageClient from "./FlightsChangePageClient";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import { localizedCustomerPath } from "@/i18n/locale-path";
import type { AppLocale } from "@/i18n/routing";
import { safeInternalPath } from "@/lib/auth/redirect";
import { getServerAuthz } from "@/lib/authz/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataForLocalizedRoute(locale, "/flights/change", {
    robots: { index: false, follow: true },
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
}) {
  const { locale, bookingId } = await params;
  const { userId } = await getServerAuthz();
  const loc = locale as AppLocale;
  const returnPath = safeInternalPath(
    localizedCustomerPath(loc, `/flights/change/${encodeURIComponent(bookingId)}`),
    localizedCustomerPath(loc, "/profile/bookings"),
  );
  if (!userId) {
    redirect(`/${locale}/login?next=${encodeURIComponent(returnPath)}`);
  }
  return <FlightsChangePageClient bookingId={bookingId} />;
}
