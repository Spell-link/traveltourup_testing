"use client";

import { useMemo } from "react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import { Input } from "@/components/ui/Input";
import { authInputClass } from "@/components/auth/authFormStyles";
import { buildE164FromParts } from "@/lib/validations/phone.schema";

const POPULAR_COUNTRY_CODES = ["US", "GB", "PK", "AE", "SA", "IN", "CA", "AU", "DE", "FR"] as const;

type Props = {
  idPrefix?: string;
  countryCallingCode: string;
  nationalNumber: string;
  onCountryCallingCodeChange: (value: string) => void;
  onNationalNumberChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  /** Hidden input name for server actions */
  phoneFieldName?: string;
};

export function PhoneNumberField({
  idPrefix = "phone",
  countryCallingCode,
  nationalNumber,
  onCountryCallingCodeChange,
  onNationalNumberChange,
  disabled,
  error,
  phoneFieldName = "phone",
}: Props) {
  const countries = useMemo(() => {
    const all = getCountries().map((iso) => ({
      iso,
      callingCode: `+${getCountryCallingCode(iso)}`,
    }));
    const popular = POPULAR_COUNTRY_CODES.map((iso) => ({
      iso,
      callingCode: `+${getCountryCallingCode(iso)}`,
    }));
    const popularSet = new Set(POPULAR_COUNTRY_CODES);
    const rest = all.filter((c) => !popularSet.has(c.iso as (typeof POPULAR_COUNTRY_CODES)[number]));
    rest.sort((a, b) => a.iso.localeCompare(b.iso));
    return [...popular, ...rest];
  }, []);

  const e164Preview = buildE164FromParts(countryCallingCode, nationalNumber);

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-foreground">Mobile number</span>
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-2">
        <select
          id={`${idPrefix}-country`}
          aria-label="Country calling code"
          value={countryCallingCode}
          onChange={(e) => onCountryCallingCodeChange(e.target.value)}
          disabled={disabled}
          className={`${authInputClass} max-w-[7.5rem] shrink-0 px-2 dropdown-scrollbar`}
        >
          {countries.map((c) => (
            <option key={c.iso} value={c.callingCode}>
              {c.iso} {c.callingCode}
            </option>
          ))}
        </select>
        </div>
        <div className="col-span-10">
        <Input
          id={`${idPrefix}-national`}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="Mobile number"
          value={nationalNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNationalNumberChange(e.target.value)}
          disabled={disabled}
          className={`${authInputClass} min-w-0 flex-1`}
          error={error}
        />
        </div>
      </div>
      {phoneFieldName && e164Preview ? (
        <input type="hidden" name={phoneFieldName} value={e164Preview} readOnly />
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {e164Preview ? `We will send a verification code to ${e164Preview}.` : "Include your country code."}
        </p>
      )}
    </div>
  );
}

export function defaultCallingCodeForLocale(locale: string): string {
  const map: Record<string, string> = {
    en: "+1",
    ar: "+971",
    ur: "+92",
  };
  return map[locale.split("-")[0] ?? ""] ?? "+1";
}
