"use client";

import type React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";

type Props = {
  specialRequests: string;
  loyaltyNumber: string;
  loyaltySupported: boolean;
  onSpecialRequestsChange: (v: string) => void;
  onLoyaltyChange: (v: string) => void;
};

export function HotelCheckoutAdditionalInfo({
  specialRequests,
  loyaltyNumber,
  loyaltySupported,
  onSpecialRequestsChange,
  onLoyaltyChange,
}: Props) {
  const t = useTranslations("Hotels.checkout");

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/80 p-4 md:p-5">
      <h3 className="text-lg font-bold text-foreground">{t("additionalInfoTitle")}</h3>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {t("specialRequestsLabel")}
        </label>
        <textarea
          className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={specialRequests}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onSpecialRequestsChange(e.target.value)}
          maxLength={500}
          placeholder={t("specialRequestsPlaceholder")}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("specialRequestsDisclaimer")}</p>
      </div>
      <div>
        <Input
          label={t("loyaltyLabel")}
          value={loyaltyNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onLoyaltyChange(e.target.value)}
          disabled={!loyaltySupported}
          placeholder={loyaltySupported ? t("loyaltyPlaceholder") : undefined}
        />
        {!loyaltySupported ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{t("loyaltyUnavailable")}</p>
        ) : null}
      </div>
    </div>
  );
}
