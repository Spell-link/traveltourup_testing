"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { FlightAirportSuggestSkeleton } from "@/components/flights/FlightSkeletons";
import { useDuffelAirportSuggest } from "@/components/flights/useDuffelAirportSuggest";
import { COMBO_FIELD_SHELL_CLASS } from "@/components/ui/inputFieldStyles";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  onChange: (iata: string) => void;
  id?: string;
  disabled?: boolean;
  /** Compact height for booking-detail forms (default uses hero search height). */
  compact?: boolean;
};

export function FlightAirportCombobox({
  label,
  value,
  onChange,
  id,
  disabled,
  compact = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const { rows, loading } = useDuffelAirportSuggest(open, query);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const shellClass = compact
    ? "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground ring-offset-background h-11"
    : COMBO_FIELD_SHELL_CLASS;

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          shellClass,
          "flex cursor-pointer items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        <span className="truncate font-medium">{value ? value.toUpperCase() : label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card shadow-lg">
            <div className="sticky top-0 border-b border-border bg-card p-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city or airport"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
            </div>
            {loading && query.length >= 2 ? <FlightAirportSuggestSkeleton rows={6} /> : null}
            {!loading && query.length >= 2 && rows.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No airports found</p>
            ) : null}
            {rows.map((dto) => (
              <div
                key={dto.iata_code}
                role="option"
                aria-selected={value.toUpperCase() === dto.iata_code}
                className="cursor-pointer border-b border-border px-4 py-3 last:border-b-0 hover:bg-primary/10"
                onClick={() => {
                  onChange(dto.iata_code);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">
                      {dto.city_name || dto.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{dto.name}</div>
                  </div>
                  <div className="shrink-0 rounded bg-muted px-2 py-1 font-mono text-sm text-muted-foreground">
                    {dto.iata_code}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
