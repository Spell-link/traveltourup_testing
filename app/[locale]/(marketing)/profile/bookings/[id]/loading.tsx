import { BookingDetailLoading } from "@/components/bookings/BookingDetailSkeleton";

export default function ProfileBookingDetailLoading() {
  return (
    <div className="container mx-auto bg-muted px-2 py-4 sm:p-6 md:p-8">
      <BookingDetailLoading />
    </div>
  );
}
