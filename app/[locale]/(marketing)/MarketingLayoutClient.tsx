"use client";

import Navbar from "@/components/shared/Navbar";
import Breadcrumb from "@/components/shared/Breadcrumb";
import Footer from "@/components/shared/Footer";
import { BookingBreadcrumbProfileBookingProvider } from "@/components/shared/BookingBreadcrumbProfileBookingContext";

export function MarketingLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <BookingBreadcrumbProfileBookingProvider>
        <Breadcrumb />
        <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
      </BookingBreadcrumbProfileBookingProvider>
      <Footer />
    </>
  );
}
