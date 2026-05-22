"use client";

import { User } from "lucide-react";

import type { DuffelOrderPassengerDisplay } from "@/lib/flights/duffel-order-display";

export function BookingDuffelPassengersSection({
  passengers,
  adultCount,
}: {
  passengers: DuffelOrderPassengerDisplay[];
  adultCount: number;
}) {
  if (passengers.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Passengers</h2>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
        <User className="h-3.5 w-3.5" aria-hidden />
        Adult: {adultCount}
      </p>
      <ul className="mt-4 space-y-6">
        {passengers.map((p) => (
          <li key={p.id}>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="mt-0.5 font-medium text-foreground">{p.name}</dd>
              </div>
              {p.dateOfBirth ? (
                <div>
                  <dt className="text-muted-foreground">Date of birth</dt>
                  <dd className="mt-0.5 text-foreground">{p.dateOfBirth}</dd>
                </div>
              ) : null}
              {p.gender ? (
                <div>
                  <dt className="text-muted-foreground">Gender</dt>
                  <dd className="mt-0.5 text-foreground">{p.gender}</dd>
                </div>
              ) : null}
              {p.email ? (
                <div>
                  <dt className="text-muted-foreground">E-mail</dt>
                  <dd className="mt-0.5 text-foreground">{p.email}</dd>
                </div>
              ) : null}
              {p.phone ? (
                <div>
                  <dt className="text-muted-foreground">Contact number</dt>
                  <dd className="mt-0.5 text-foreground">{p.phone}</dd>
                </div>
              ) : null}
            </dl>
            {p.flightSummary ? (
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                <p className="text-foreground">{p.flightSummary}</p>
                {p.baggageLabels.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">{p.baggageLabels.join(" · ")}</p>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
