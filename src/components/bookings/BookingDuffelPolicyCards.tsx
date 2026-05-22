"use client";

import type { DuffelOrderPolicy } from "@/lib/flights/duffel-order-display";

export function BookingDuffelPolicyCards({ policies }: { policies: DuffelOrderPolicy }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Order change policy</h3>
        <p className="mt-2 text-sm text-muted-foreground">{policies.changeText}</p>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Order refund policy</h3>
        <p className="mt-2 text-sm text-muted-foreground">{policies.refundText}</p>
      </section>
    </div>
  );
}
