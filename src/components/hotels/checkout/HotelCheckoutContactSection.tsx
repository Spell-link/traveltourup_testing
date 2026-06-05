"use client";

import type React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";

type Props = {
  email: string;
  phone: string;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  issueFor: (path: string) => string | undefined;
};

export function HotelCheckoutContactSection({
  email,
  phone,
  onEmailChange,
  onPhoneChange,
  issueFor,
}: Props) {
  const t = useTranslations("Hotels.checkout");

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/80 p-4 md:p-5">
      <div>
        <h3 className="text-lg font-bold text-foreground">{t("contactDetailsTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("contactDetailsHint")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t("emailLabel")}
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEmailChange(e.target.value)}
          error={issueFor("email")}
          required
        />
        <Input
          label={t("phoneLabel")}
          type="tel"
          placeholder={t("phonePlaceholder")}
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPhoneChange(e.target.value)}
          error={issueFor("phone_number")}
          required
        />
      </div>
    </div>
  );
}
