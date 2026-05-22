"use client";

import type React from "react";
import { Input } from "@/components/ui/Input";
import type { CheckoutContactState } from "@/components/flights/checkout/checkout-types";

type Props = {
  contact: CheckoutContactState;
  onChange: (next: CheckoutContactState) => void;
  emailError?: string;
  phoneError?: string;
  labels: {
    title: string;
    hint: string;
    email: string;
    phone: string;
    phonePlaceholder: string;
  };
};

export function FlightCheckoutContactSection({
  contact,
  onChange,
  emailError,
  phoneError,
  labels,
}: Props) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card/80 p-4 md:p-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">{labels.title}</h3>
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id="flight-checkout-contact-email"
          label={labels.email}
          type="email"
          autoComplete="email"
          value={contact.email}
          error={emailError}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...contact, email: e.target.value })}
        />
        <Input
          id="flight-checkout-contact-phone"
          label={labels.phone}
          type="tel"
          autoComplete="tel"
          placeholder={labels.phonePlaceholder}
          value={contact.phone_number}
          error={phoneError}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...contact, phone_number: e.target.value })
          }
        />
      </div>
    </section>
  );
}
