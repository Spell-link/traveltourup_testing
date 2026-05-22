import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { localizedCustomerPath } from "@/i18n/locale-path";
import type { AppLocale } from "@/i18n/routing";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import { getServerAuthz } from "@/lib/authz/session";
import { MyBookingsTable } from "@/components/bookings/my-bookings-table";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataForLocalizedRoute(locale, "/profile/bookings", {
    robots: { index: false, follow: true },
  });
}

type SearchParams = { highlight?: string };

export default async function ProfileBookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const { userId } = await getServerAuthz();
  if (!userId) {
    const nextTarget = localizedCustomerPath(locale as AppLocale, "/profile/bookings");
    redirect(`/${locale}/login?next=${encodeURIComponent(nextTarget)}`);
  }

  const sp = await searchParams;
  const highlight = sp.highlight?.trim() || null;

  return (
    <main className="bg-muted/40 py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-8">
        <div>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
            <MyBookingsTable
              standalone
              syncUrl
              showFullscreen
              showHeader
              highlightRef={highlight}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
