"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type BookingBreadcrumbProfileBookingContextValue = {
  profileBookingCrumbLabel: string | null;
  setProfileBookingCrumbLabel: (label: string | null) => void;
};

const BookingBreadcrumbProfileBookingContext =
  createContext<BookingBreadcrumbProfileBookingContextValue | null>(null);

export function BookingBreadcrumbProfileBookingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profileBookingCrumbLabel, setProfileBookingCrumbLabelState] = useState<string | null>(null);

  const setProfileBookingCrumbLabel = useCallback((label: string | null) => {
    setProfileBookingCrumbLabelState(label);
  }, []);

  useEffect(() => {
    setProfileBookingCrumbLabelState(null);
  }, [pathname]);

  const value = useMemo(
    () => ({ profileBookingCrumbLabel, setProfileBookingCrumbLabel }),
    [profileBookingCrumbLabel, setProfileBookingCrumbLabel],
  );

  return (
    <BookingBreadcrumbProfileBookingContext.Provider value={value}>
      {children}
    </BookingBreadcrumbProfileBookingContext.Provider>
  );
}

export function useBookingBreadcrumbProfileBookingTitle(): BookingBreadcrumbProfileBookingContextValue {
  const ctx = useContext(BookingBreadcrumbProfileBookingContext);
  if (!ctx) {
    return {
      profileBookingCrumbLabel: null,
      setProfileBookingCrumbLabel: () => {},
    };
  }
  return ctx;
}
