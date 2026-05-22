"use client";

import type React from "react";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import type { FlightCheckoutIdentityDocument } from "@/lib/validations/flight-checkout.schema";
import type { RegionSelectOption } from "@/lib/region-select-options";

type Props = {
  passengerId: string;
  document: FlightCheckoutIdentityDocument;
  countryOptions: RegionSelectOption[];
  onChange: (next: FlightCheckoutIdentityDocument) => void;
  errors: {
    section?: string;
    number?: string;
    country?: string;
    expiresOn?: string;
  };
  labels: {
    title: string;
    number: string;
    country: string;
    countryPlaceholder: string;
    expiresOn: string;
  };
};

export function FlightCheckoutPassportSection({
  passengerId,
  document,
  countryOptions,
  onChange,
  errors,
  labels,
}: Props) {
  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <h4 className="text-sm font-semibold text-foreground">{labels.title}</h4>
      {errors.section ? <p className="text-xs text-destructive">{errors.section}</p> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NativeSelect
          id={`${passengerId}-passport-country`}
          label={labels.country}
          value={document.issuing_country_code}
          error={errors.country}
          onChange={(e) => onChange({ ...document, issuing_country_code: e.target.value })}
        >
          <option value="">{labels.countryPlaceholder}</option>
          {countryOptions.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({c.code})
            </option>
          ))}
        </NativeSelect>
        <Input
          id={`${passengerId}-passport-number`}
          label={labels.number}
          value={document.unique_identifier}
          error={errors.number}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...document, unique_identifier: e.target.value })
          }
        />
        <Input
          id={`${passengerId}-passport-expires`}
          label={labels.expiresOn}
          type="date"
          value={document.expires_on}
          wrapperClassName="sm:col-span-2"
          error={errors.expiresOn}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...document, expires_on: e.target.value })
          }
        />
      </div>
    </div>
  );
}
