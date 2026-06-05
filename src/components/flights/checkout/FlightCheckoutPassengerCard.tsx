"use client";

import type React from "react";
import { Input } from "@/components/ui/Input";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { FlightCheckoutPassportSection } from "@/components/flights/checkout/FlightCheckoutPassportSection";
import type { PassengerFormRow } from "@/components/flights/checkout/checkout-types";
import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import { isInfantPassengerType } from "@/lib/flights/infant-passenger-linking";
import type { RegionSelectOption } from "@/lib/region-select-options";

type AdultOption = {
  id: string;
  label: string;
};

type Props = {
  index: number;
  total: number;
  row: PassengerFormRow;
  offerPassenger: FlightOfferDTO["passengers"][number] | undefined;
  typeLabel: string;
  maxBornOnYmd: string | null;
  showPassport: boolean;
  adultOptions: AdultOption[];
  countryOptions: RegionSelectOption[];
  fieldError: (field: string) => string | undefined;
  passportFieldError: (field: string) => string | undefined;
  onChange: (next: PassengerFormRow) => void;
  labels: {
    passengerIndex: string;
    referenceLabel: string;
    personalDetailsTitle: string;
    titleField: string;
    genderField: string;
    titleMr: string;
    titleMrs: string;
    titleMs: string;
    titleMiss: string;
    titleDr: string;
    genderMale: string;
    genderFemale: string;
    givenName: string;
    familyName: string;
    dob: string;
    infantAdult: string;
    selectAdult: string;
    passportTitle: string;
    passportNumber: string;
    passportCountry: string;
    passportCountryPlaceholder: string;
    passportExpires: string;
  };
};

export function FlightCheckoutPassengerCard({
  index,
  row,
  offerPassenger,
  typeLabel,
  maxBornOnYmd,
  showPassport,
  adultOptions,
  countryOptions,
  fieldError,
  passportFieldError,
  onChange,
  labels,
}: Props) {
  const isInfant = isInfantPassengerType(offerPassenger?.type);
  const typeOrdinal = offerPassenger?.type?.toLowerCase() ?? "passenger";
  const displayType =
    typeOrdinal === "adult" || typeOrdinal === "child" || typeOrdinal === "infant" || typeOrdinal === "infant_without_seat"
      ? `${typeLabel} ${index + 1}`
      : typeLabel;

  const passportDoc = row.identity_documents[0];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/80 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div>
          <p className="text-base font-semibold text-foreground">{labels.passengerIndex}</p>
          <p className="text-xs text-muted-foreground">
            {labels.referenceLabel} <span className="font-mono">{row.passenger_id}</span>
          </p>
        </div>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          {displayType}
        </span>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-muted-foreground">{labels.personalDetailsTitle}</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="min-w-0 sm:col-span-2">
            <NativeSelect
              id={`${row.passenger_id}-title`}
              label={labels.titleField}
              value={row.title}
              onChange={(e) => onChange({ ...row, title: e.target.value as PassengerFormRow["title"] })}
            >
              <option value="mr">{labels.titleMr}</option>
              <option value="mrs">{labels.titleMrs}</option>
              <option value="ms">{labels.titleMs}</option>
              <option value="miss">{labels.titleMiss}</option>
              <option value="dr">{labels.titleDr}</option>
            </NativeSelect>
          </div>

          <Input
            id={`${row.passenger_id}-given`}
            label={labels.givenName}
            value={row.given_name}
            error={fieldError("given_name")}
            wrapperClassName="sm:col-span-5"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...row, given_name: e.target.value })
            }
          />
          <Input
            id={`${row.passenger_id}-family`}
            label={labels.familyName}
            value={row.family_name}
            error={fieldError("family_name")}
            wrapperClassName="sm:col-span-5"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...row, family_name: e.target.value })
            }
          />
          <div className="sm:col-span-6">
            <NativeSelect
              id={`${row.passenger_id}-gender`}
              label={labels.genderField}
              value={row.gender}
              onChange={(e) => onChange({ ...row, gender: e.target.value as PassengerFormRow["gender"] })}
            >
              <option value="m">{labels.genderMale}</option>
              <option value="f">{labels.genderFemale}</option>
            </NativeSelect>
          </div>

          <Input
            id={`${row.passenger_id}-dob`}
            label={labels.dob}
            type="date"
            value={row.born_on}
            max={maxBornOnYmd ?? undefined}
            wrapperClassName="sm:col-span-6"
            error={fieldError("born_on")}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...row, born_on: e.target.value })
            }
          />
          {isInfant && adultOptions.length > 0 ? (
            <NativeSelect
              id={`${row.passenger_id}-infant-adult`}
              label={labels.infantAdult}
              wrapperClassName="sm:col-span-12"
              value={row.accompanying_adult_id ?? ""}
              error={fieldError("accompanying_adult_id")}
              onChange={(e) => onChange({ ...row, accompanying_adult_id: e.target.value })}
            >
              <option value="">{labels.selectAdult}</option>
              {adultOptions.map((adult) => (
                <option key={adult.id} value={adult.id}>
                  {adult.label}
                </option>
              ))}
            </NativeSelect>
          ) : null}
        </div>
      </div>

      {showPassport && passportDoc ? (
        <FlightCheckoutPassportSection
          passengerId={row.passenger_id}
          document={passportDoc}
          countryOptions={countryOptions}
          onChange={(doc) => onChange({ ...row, identity_documents: [doc] })}
          errors={{
            section: passportFieldError("identity_documents"),
            number: passportFieldError("unique_identifier"),
            country: passportFieldError("issuing_country_code"),
            expiresOn: passportFieldError("expires_on"),
          }}
          labels={{
            title: labels.passportTitle,
            number: labels.passportNumber,
            country: labels.passportCountry,
            countryPlaceholder: labels.passportCountryPlaceholder,
            expiresOn: labels.passportExpires,
          }}
        />
      ) : null}
    </div>
  );
}
