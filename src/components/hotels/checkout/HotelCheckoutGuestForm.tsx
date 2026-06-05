"use client";

import type React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import {
  defaultChildBornOn,
  guestSlotsFromSession,
  requiredGuestCount,
  type StaysCheckoutGuestFormRow,
} from "@/lib/stays/stays-checkout-occupancy";
import type { StaysQuoteSession } from "@/lib/stays/stays-quote-session";

type Props = {
  session: StaysQuoteSession | null;
  guests: StaysCheckoutGuestFormRow[];
  onChange: (guests: StaysCheckoutGuestFormRow[]) => void;
  issueFor: (path: string) => string | undefined;
};

export function HotelCheckoutGuestForm({ session, guests, onChange, issueFor }: Props) {
  const t = useTranslations("Hotels.checkout");
  const count = requiredGuestCount({
    adults: session?.adults,
    children: session?.children,
    rooms: session?.rooms,
  });
  const slots = guestSlotsFromSession(session);

  const updateGuest = (index: number, patch: Partial<StaysCheckoutGuestFormRow>) => {
    const next = [...guests];
    while (next.length < count) {
      const i = next.length;
      const kind = slots[i]?.kind ?? "adult";
      next.push({
        given_name: "",
        family_name: "",
        born_on: kind === "child" ? defaultChildBornOn() : i === 0 ? "1990-01-01" : "",
      });
    }
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">{t("guestDetailsTitle")}</h3>
      {Array.from({ length: count }, (_, i) => {
        const slot = slots[i];
        const kind = slot?.kind ?? (i === 0 ? "lead_adult" : "adult");
        const row = guests[i] ?? { given_name: "", family_name: "", born_on: "" };
        const showDob = kind === "lead_adult" || kind === "child";
        return (
          <div
            key={`guest-${i}`}
            className="space-y-3 rounded-xl border border-border bg-card/80 p-4 md:p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("guestIndex", { current: i + 1, total: count })}
              </span>
              {kind === "lead_adult" ? (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t("leadGuestBadge")}
                </span>
              ) : null}
              {kind === "child" ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {t("childGuestBadge")}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label={t("firstNameLabel")}
                value={row.given_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateGuest(i, { given_name: e.target.value })}
                error={issueFor(`guests.${i}.given_name`)}
                required
              />
              <Input
                label={t("lastNameLabel")}
                value={row.family_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateGuest(i, { family_name: e.target.value })}
                error={issueFor(`guests.${i}.family_name`)}
                required
              />
            </div>
            {showDob ? (
              <Input
                label={t("dobLabel")}
                type="date"
                value={row.born_on}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateGuest(i, { born_on: e.target.value })}
                error={issueFor(`guests.${i}.born_on`)}
                required={kind === "lead_adult" || kind === "child"}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
