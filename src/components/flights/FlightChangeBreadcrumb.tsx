"use client";

import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

export type FlightChangeBreadcrumbStep = "change" | "offers" | "payment";

type Props = {
  bookingId: string;
  bookingRefNo: string;
  step: FlightChangeBreadcrumbStep;
};

const STEPS: { id: FlightChangeBreadcrumbStep; label: string }[] = [
  { id: "change", label: "Change order" },
  { id: "offers", label: "Available flights" },
  { id: "payment", label: "Confirm and pay" },
];

function stepHref(bookingId: string, step: FlightChangeBreadcrumbStep): string {
  const base = `/flights/change/${encodeURIComponent(bookingId)}`;
  if (step === "change") return base;
  if (step === "offers") return base;
  return `${base}/payment`;
}

export function FlightChangeBreadcrumb({ bookingId, bookingRefNo, step }: Props) {
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <nav aria-label="Change flow" className="mb-6 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/profile/bookings" className="hover:text-foreground">
            My bookings
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <li>
          <Link
            href={`/profile/bookings/${encodeURIComponent(bookingId)}`}
            className="hover:text-foreground"
          >
            {bookingRefNo}
          </Link>
        </li>
        {STEPS.slice(0, stepIndex + 1).map((s, i) => (
          <li key={s.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {i === stepIndex ? (
              <span className="font-medium text-foreground">{s.label}</span>
            ) : (
              <Link href={stepHref(bookingId, s.id)} className="hover:text-foreground">
                {s.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
