import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { localizedCustomerPath } from "@/i18n/locale-path";
import type { AppLocale } from "@/i18n/routing";
import { metadataForLocalizedRoute } from "@/config/metadata.config";
import { getServerAuthz } from "@/lib/authz/session";
import { BookingDetailView } from "@/components/bookings/BookingDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  return metadataForLocalizedRoute(locale, "/profile/bookings/detail", {
    robots: { index: false, follow: true },
    canonicalPath: `/profile/bookings/${id}`,
  });
}

export default async function ProfileBookingDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { userId } = await getServerAuthz();
  const { id, locale } = await params;
  if (!userId) {
    const nextTarget = localizedCustomerPath(locale as AppLocale, `/profile/bookings/${id}`);
    redirect(`/${locale}/login?next=${encodeURIComponent(nextTarget)}`);
  }

  return (

      <div className="container mx-auto bg-muted py-4 px-2 sm:p-6 md:p-8">
          <BookingDetailView bookingId={id} />
      </div>

  );
}
