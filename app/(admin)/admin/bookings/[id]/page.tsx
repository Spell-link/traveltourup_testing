import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import { BookingDetailView } from "@/components/bookings/BookingDetailView";
import { defaultLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <NextIntlClientProvider locale={defaultLocale} messages={enMessages}>
      <main className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <BookingDetailView
          bookingId={id}
          backHref="/admin/bookings"
          backLabel="Back to admin bookings"
          showAdminTicketTools
        />
      </main>
    </NextIntlClientProvider>
  );
}
