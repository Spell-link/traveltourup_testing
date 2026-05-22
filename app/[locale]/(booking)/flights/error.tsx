"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FlightsError({ error, reset }: Props) {
  const t = useTranslations("Flights.results");

  useEffect(() => {
    console.error("Flights route error:", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground mb-2">
        {t("searchFailed")}
      </h1>
      <p className="text-muted-foreground mb-6">
        Something went wrong loading flights. You can try again or start a new search.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Try again
        </button>
        <Link
          href="/flights"
          className="rounded-lg border border-border px-6 py-3 font-semibold text-foreground"
        >
          Back to search
        </Link>
        <Link
          href="/profile/bookings"
          className="rounded-lg border border-border px-6 py-3 font-semibold text-foreground"
        >
          My bookings
        </Link>
      </div>
    </div>
  );
}
