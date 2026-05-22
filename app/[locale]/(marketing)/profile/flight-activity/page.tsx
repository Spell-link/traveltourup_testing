import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { localizedCustomerPath } from "@/i18n/locale-path";
import type { AppLocale } from "@/i18n/routing";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import { getServerAuthz } from "@/lib/authz/session";
import { ProfileFlightLedgerPanel } from "@/components/profile/ProfileFlightLedgerPanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return metadataForLocalizedRoute(locale, "/profile/flight-activity", {
    robots: { index: false, follow: true },
  });
}

export default async function ProfileFlightActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId } = await getServerAuthz();
  if (!userId) {
    const nextTarget = localizedCustomerPath(locale as AppLocale, "/profile/flight-activity");
    redirect(`/${locale}/login?next=${encodeURIComponent(nextTarget)}`);
  }

  return (
    <main className="bg-muted/40 py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-8">
        <div>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
            <ProfileFlightLedgerPanel
              standalone
              syncUrl
              showFullscreen
              showHeader
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
